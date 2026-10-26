package app.compas.alarmas;

import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioTrack;

/**
 * Los cinco tonos de la web (Sirena, Pitido, Amanecer, Brisa, Órbita), sintetizados con las
 * mismas notas que src/lib/sound.ts. La web lanza el sonido (unos 1,8 s) cada 2 s mientras la
 * alarma no se desbloquea, así que aquí el bucle dura 2 s y acaba con un pequeño silencio.
 *
 * Los osciladores son de banda limitada (suma de armónicos) como los del navegador. La web
 * pasa el sonido por un compresor; aquí no se imita, y en su lugar todos los tonos se
 * normalizan al mismo nivel. El volumen real lo marca el volumen de alarma del móvil.
 */
final class Tono {
    static final int FRECUENCIA_MUESTREO = 44100;
    /** Duración del bucle: coincide con el intervalo de repetición de la web. */
    static final double SEGUNDOS_BUCLE = 2.0;
    private static final double PICO = 0.9;

    private enum Onda { SIERRA, CUADRADA, TRIANGULO }

    private Tono() {}

    static boolean esConocido(String tono) {
        return "Sirena".equals(tono) || "Pitido".equals(tono) || "Amanecer".equals(tono)
                || "Brisa".equals(tono) || "Órbita".equals(tono);
    }

    /** Muestras del bucle, en 16 bits con signo. Sin clases de Android para poder probarlo. */
    static short[] generar(String tono, int fm) {
        int n = (int) Math.round(fm * SEGUNDOS_BUCLE);
        double[] salida = new double[n];

        if ("Sirena".equals(tono)) {
            for (int i = 0; i < 4; i++) {
                double desde = (i % 2 == 1) ? 1400 : 700;
                double hasta = (i % 2 == 1) ? 700 : 1400;
                nota(salida, fm, Onda.SIERRA, desde, hasta, i * 0.45, 0.45, 0.6);
            }
        } else if ("Pitido".equals(tono)) {
            for (int i = 0; i < 4; i++) {
                nota(salida, fm, Onda.CUADRADA, 2000, 2000, i * 0.45, 0.25, 0.6);
            }
        } else {
            double base = "Brisa".equals(tono) ? 660 : "Órbita".equals(tono) ? 440 : 880;
            for (int i = 0; i < 4; i++) {
                double f = base + (i % 3) * 110;
                nota(salida, fm, Onda.TRIANGULO, f, f, i * 0.45, 0.35, 0.8);
            }
        }

        double maximo = 0;
        for (double v : salida) maximo = Math.max(maximo, Math.abs(v));
        double escala = maximo > 0 ? PICO / maximo : 0;
        short[] muestras = new short[n];
        for (int i = 0; i < n; i++) {
            muestras[i] = (short) Math.round(salida[i] * escala * 32767.0);
        }
        return muestras;
    }

    /**
     * Una nota como las de sound.ts: la frecuencia cambia en línea recta de `desde` a `hasta`,
     * el volumen sube de forma exponencial en 20 ms, se mantiene y baja de forma exponencial
     * durante los últimos 50 ms. Se suma al buffer, que ya contiene las notas anteriores.
     */
    private static void nota(double[] buffer, int fm, Onda onda, double desde, double hasta,
                             double inicio, double largo, double volumen) {
        final double suelo = 0.0001;
        int primera = (int) Math.round(inicio * fm);
        int ultima = Math.min(buffer.length, (int) Math.round((inicio + largo) * fm));
        double fase = 0.0;
        for (int i = primera; i < ultima; i++) {
            double t = (double) (i - primera) / fm;
            double frecuencia = desde + (hasta - desde) * (t / largo);

            double ganancia;
            if (t < 0.02) {
                ganancia = suelo * Math.pow(volumen / suelo, t / 0.02);
            } else if (t < largo - 0.05) {
                ganancia = volumen;
            } else {
                ganancia = volumen * Math.pow(suelo / volumen, (t - (largo - 0.05)) / 0.05);
            }

            buffer[i] += 0.9 * ganancia * oscilador(onda, fase, frecuencia, fm);
            fase += 2.0 * Math.PI * frecuencia / fm;
        }
    }

    /** Onda de banda limitada: solo los armónicos que caben por debajo de Nyquist. */
    private static double oscilador(Onda onda, double fase, double frecuencia, int fm) {
        int armonicos = (int) Math.floor((fm / 2.0) / frecuencia);
        double suma = 0.0;
        switch (onda) {
            case SIERRA:
                for (int k = 1; k <= armonicos; k++) {
                    suma += ((k % 2 == 1) ? 1.0 : -1.0) * Math.sin(k * fase) / k;
                }
                return suma * 2.0 / Math.PI;
            case CUADRADA:
                for (int k = 1; k <= armonicos; k += 2) {
                    suma += Math.sin(k * fase) / k;
                }
                return suma * 4.0 / Math.PI;
            default:
                for (int k = 1; k <= armonicos; k += 2) {
                    double signo = (((k - 1) / 2) % 2 == 0) ? 1.0 : -1.0;
                    suma += signo * Math.sin(k * fase) / ((double) k * k);
                }
                return suma * 8.0 / (Math.PI * Math.PI);
        }
    }

    /** Crea la pista de audio lista para sonar en bucle por el canal de alarmas. */
    static AudioTrack crear(String tono) {
        short[] muestras = generar(tono, FRECUENCIA_MUESTREO);
        AudioAttributes atributos = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        AudioFormat formato = new AudioFormat.Builder()
                .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                .setSampleRate(FRECUENCIA_MUESTREO)
                .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                .build();
        AudioTrack pista = new AudioTrack.Builder()
                .setAudioAttributes(atributos)
                .setAudioFormat(formato)
                .setBufferSizeInBytes(muestras.length * 2)
                .setTransferMode(AudioTrack.MODE_STATIC)
                .build();
        pista.write(muestras, 0, muestras.length);
        pista.setLoopPoints(0, muestras.length, -1);
        return pista;
    }
}
