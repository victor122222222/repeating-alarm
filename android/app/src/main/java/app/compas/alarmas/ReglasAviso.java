package app.compas.alarmas;

import java.util.Calendar;

/** Reglas puras (sin Android) del aviso de "próxima alarma". */
final class ReglasAviso {
    /** El aviso aparece desde 12 horas antes de que suene la alarma. */
    static final long ANTELACION_MS = 12L * 60L * 60L * 1000L;

    private ReglasAviso() {}

    /** Momento en que debe aparecer el aviso de una alarma que suena en {@code ts}. */
    static long momentoAviso(long ts) {
        return ts - ANTELACION_MS;
    }

    /** True si ya toca mostrar el aviso: faltan 12 horas o menos y la alarma aún no ha sonado. */
    static boolean debeMostrar(long ts, long ahora) {
        return ts > ahora && ts - ahora <= ANTELACION_MS;
    }

    /** Texto del aviso, p. ej. "07:30" o "07:30 (mañana)". */
    static String texto(String hora, long ts, long ahora) {
        return esOtroDia(ts, ahora) ? hora + " (mañana)" : hora;
    }

    static boolean esOtroDia(long ts, long ahora) {
        Calendar a = Calendar.getInstance();
        a.setTimeInMillis(ahora);
        Calendar b = Calendar.getInstance();
        b.setTimeInMillis(ts);
        return a.get(Calendar.YEAR) != b.get(Calendar.YEAR)
                || a.get(Calendar.DAY_OF_YEAR) != b.get(Calendar.DAY_OF_YEAR);
    }
}
