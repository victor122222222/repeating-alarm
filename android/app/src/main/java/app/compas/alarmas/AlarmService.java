package app.compas.alarmas;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioTrack;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;

/**
 * Servicio en primer plano que reproduce el tono en bucle y vibra hasta que el usuario
 * desliza para parar la alarma. Muestra una notificación que abre la pantalla de alarma
 * encima del bloqueo.
 */
public class AlarmService extends Service {
    static final String ACCION_SONAR = "app.compas.alarmas.SERVICIO_SONAR";
    /** Aviso interno (solo dentro de la app) de que la alarma se ha detenido. */
    static final String ACCION_PARADA = "app.compas.alarmas.PARADA";
    /** Se envía al descartar (deslizar) la notificación: vuelve a mostrarla y abre la pantalla. */
    static final String ACCION_REABRIR = "app.compas.alarmas.REABRIR";
    static final String CANAL = "compas_alarma";
    static final String CANAL_RESPALDO = "compas_alarma_respaldo";
    static final int ID_NOTIFICACION = 4201;
    static final int ID_RESPALDO = 4202;
    /** Por seguridad, la alarma se calla sola pasado este tiempo. */
    private static final long MAXIMO_MS = 15L * 60L * 1000L;

    static volatile boolean activo = false;
    /** Datos de la alarma que suena, para poder volver a abrir su pantalla. */
    static volatile String nombreActual = "Alarma";
    static volatile String horaActual = "";
    private static volatile AlarmService instancia = null;

    private AudioTrack pista;
    private Vibrator vibrador;
    private PowerManager.WakeLock bloqueo;
    private boolean detenido = false;
    private final Handler manejador = new Handler(Looper.getMainLooper());
    private final Runnable limite = new Runnable() {
        @Override
        public void run() {
            detener();
        }
    };

    /** Para la alarma que esté sonando, si la hay. */
    static void parar() {
        AlarmService s = instancia;
        if (s != null) {
            s.manejador.post(new Runnable() {
                @Override
                public void run() {
                    s.detener();
                }
            });
        }
    }

    /** Intent que abre la pantalla completa de la alarma que está sonando. */
    static Intent intentPantalla(Context c) {
        Intent abrir = new Intent(c, AlarmRingActivity.class);
        abrir.putExtra("nombre", nombreActual);
        abrir.putExtra("hora", horaActual);
        abrir.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return abrir;
    }

    /**
     * Abre la pantalla de alarma directamente. Con el móvil desbloqueado Android solo enseña
     * una notificación flotante, así que se lanza la pantalla a mano (necesita el permiso
     * "Mostrar sobre otras apps"; sin él, queda la notificación y se puede tocar).
     */
    private void abrirPantalla() {
        try {
            startActivity(intentPantalla(this));
        } catch (RuntimeException ignorada) {
            // Android no deja abrirla desde aquí: queda la notificación.
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACCION_REABRIR.equals(intent.getAction())) {
            // Descartaron la notificación sin querer: se vuelve a poner y se abre la pantalla.
            if (activo && !detenido) {
                Notification n = construirNotificacion(this, nombreActual, horaActual, CANAL);
                if (Build.VERSION.SDK_INT >= 29) {
                    startForeground(ID_NOTIFICACION, n,
                            ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
                } else {
                    startForeground(ID_NOTIFICACION, n);
                }
                abrirPantalla();
            }
            return START_NOT_STICKY;
        }
        String nombre = intent != null ? intent.getStringExtra("nombre") : null;
        String hora = intent != null ? intent.getStringExtra("hora") : null;
        String tono = intent != null ? intent.getStringExtra("tono") : null;
        if (nombre == null) nombre = "Alarma";
        if (hora == null) hora = "";
        if (tono == null || !Tono.esConocido(tono)) tono = "Sirena";

        instancia = this;
        activo = true;
        detenido = false;
        nombreActual = nombre;
        horaActual = hora;

        crearCanal(this);
        Notification notificacion = construirNotificacion(this, nombre, hora, CANAL);
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(ID_NOTIFICACION, notificacion,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(ID_NOTIFICACION, notificacion);
        }

        adquirirBloqueo();
        detenerSonido();
        iniciarSonido(tono);
        abrirPantalla();
        manejador.removeCallbacks(limite);
        manejador.postDelayed(limite, MAXIMO_MS);
        return START_NOT_STICKY;
    }

    private void adquirirBloqueo() {
        if (bloqueo != null && bloqueo.isHeld()) return;
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm == null) return;
        bloqueo = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "Compas:alarma");
        bloqueo.acquire(MAXIMO_MS + 30000L);
    }

    private void iniciarSonido(String tono) {
        try {
            pista = Tono.crear(tono);
            pista.play();
        } catch (RuntimeException ex) {
            pista = null;
        }
        vibrador = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrador != null && vibrador.hasVibrator()) {
            long[] patron = {0, 600, 400, 600, 1400};
            AudioAttributes atributos = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
            vibrador.vibrate(VibrationEffect.createWaveform(patron, 0), atributos);
        }
    }

    private void detenerSonido() {
        if (pista != null) {
            try {
                pista.stop();
            } catch (RuntimeException ignorada) {
                // Ya estaba parada.
            }
            pista.release();
            pista = null;
        }
        if (vibrador != null) {
            vibrador.cancel();
        }
    }

    private void detener() {
        if (detenido) return;
        detenido = true;
        manejador.removeCallbacks(limite);
        detenerSonido();
        if (bloqueo != null && bloqueo.isHeld()) {
            bloqueo.release();
        }
        activo = false;
        instancia = null;
        stopForeground(STOP_FOREGROUND_REMOVE);
        sendBroadcast(new Intent(ACCION_PARADA).setPackage(getPackageName()));
        stopSelf();
    }

    @Override
    public void onDestroy() {
        detener();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // --- Notificación y canales ---

    static void crearCanal(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel canal = new NotificationChannel(CANAL, "Alarmas", NotificationManager.IMPORTANCE_HIGH);
        canal.setDescription("Alarmas de Compás cuando suenan");
        canal.setSound(null, null);
        canal.enableVibration(false);
        canal.setShowBadge(false);
        canal.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(canal);
    }

    static void crearCanalRespaldo(Context c) {
        NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        NotificationChannel canal = new NotificationChannel(
                CANAL_RESPALDO, "Alarmas (respaldo)", NotificationManager.IMPORTANCE_HIGH);
        Uri sonido = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        AudioAttributes atributos = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
        canal.setSound(sonido, atributos);
        canal.enableVibration(true);
        canal.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        nm.createNotificationChannel(canal);
    }

    static Notification construirNotificacion(Context c, String nombre, String hora, String canal) {
        Intent abrir = new Intent(c, AlarmRingActivity.class);
        abrir.putExtra("nombre", nombre);
        abrir.putExtra("hora", hora);
        abrir.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(c, 3, abrir,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        PendingIntent descartada = PendingIntent.getService(c, 4,
                new Intent(c, AlarmService.class).setAction(ACCION_REABRIR),
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = new Notification.Builder(c, canal)
                .setSmallIcon(R.drawable.ic_notif)
                .setContentTitle(hora + " · " + nombre)
                .setContentText("Desliza para detener la alarma")
                .setCategory(Notification.CATEGORY_ALARM)
                .setOngoing(true)
                .setAutoCancel(false)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(pi)
                .setFullScreenIntent(pi, true);
        if (CANAL.equals(canal)) {
            b.setDeleteIntent(descartada);
        }
        return b.build();
    }
}
