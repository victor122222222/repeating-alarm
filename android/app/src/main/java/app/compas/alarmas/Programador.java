package app.compas.alarmas;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

/**
 * Programa en el sistema la siguiente alarma de la lista. Usa setAlarmClock, que Android
 * trata como una alarma de despertador: suena a su hora aunque el móvil esté en reposo.
 */
final class Programador {
    static final String ACCION_SONAR = "app.compas.alarmas.SONAR";
    private static final int CODIGO_PRINCIPAL = 1;
    private static final int CODIGO_PRUEBA = 2;
    private static final int CODIGO_ABRIR = 0;
    /** Si el móvil estaba apagado, una alarma de hace menos de esto suena nada más arrancar. */
    static final long GRACIA_MS = 10L * 60L * 1000L;

    private Programador() {}

    /** Busca la siguiente alarma pendiente sin modificar nada. */
    static Evento buscarSiguiente(Context c, long ahora) {
        long ultimo = Almacen.ultimo(c);
        List<Evento> lista = Almacen.leer(c);
        for (Evento e : lista) {
            if (e.ts <= ultimo) continue;
            if (e.ts < ahora - GRACIA_MS) continue;
            return e;
        }
        return null;
    }

    static void programarSiguiente(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        long ahora = System.currentTimeMillis();
        if (Almacen.ultimo(c) > ahora) {
            // El reloj se ha retrasado: olvidamos la marca para no ignorar alarmas futuras.
            Almacen.marcarUltimo(c, ahora);
        }
        Evento siguiente = buscarSiguiente(c, ahora);
        if (siguiente == null) {
            am.cancel(pendienteSonar(c, null, CODIGO_PRINCIPAL, false));
            return;
        }
        long cuando = Math.max(siguiente.ts, ahora + 1000L);
        PendingIntent operacion = pendienteSonar(c, siguiente, CODIGO_PRINCIPAL, false);
        am.setAlarmClock(new AlarmManager.AlarmClockInfo(cuando, pendienteAbrirApp(c)), operacion);
    }

    static void cancelarTodas(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        am.cancel(pendienteSonar(c, null, CODIGO_PRINCIPAL, false));
        Almacen.guardar(c, new java.util.ArrayList<Evento>());
    }

    /** Hace sonar una alarma de prueba en pocos segundos, para comprobar el bloqueo. */
    static void programarPrueba(Context c, String tono) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        long cuando = System.currentTimeMillis() + 8000L;
        String hora = new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date(cuando));
        Evento prueba = new Evento("prueba", cuando, "Prueba de alarma", hora, tono);
        am.setAlarmClock(new AlarmManager.AlarmClockInfo(cuando, pendienteAbrirApp(c)),
                pendienteSonar(c, prueba, CODIGO_PRUEBA, true));
    }

    static boolean puedeProgramarExactas(Context c) {
        if (Build.VERSION.SDK_INT < 31) return true;
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        return am != null && am.canScheduleExactAlarms();
    }

    private static PendingIntent pendienteSonar(Context c, Evento e, int codigo, boolean prueba) {
        Intent i = new Intent(c, AlarmReceiver.class);
        i.setAction(ACCION_SONAR);
        if (e != null) {
            i.putExtra("ts", e.ts);
            i.putExtra("id", e.id);
            i.putExtra("nombre", e.nombre);
            i.putExtra("hora", e.hora);
            i.putExtra("tono", e.tono);
            i.putExtra("prueba", prueba);
        }
        return PendingIntent.getBroadcast(c, codigo, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static PendingIntent pendienteAbrirApp(Context c) {
        Intent i = new Intent(c, MainActivity.class);
        return PendingIntent.getActivity(c, CODIGO_ABRIR, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
}
