package app.compas.alarmas;

/** Una vez concreta en la que debe sonar una alarma (calculada por la web). */
final class Evento {
    final String id;
    final long ts;
    final String nombre;
    final String hora;
    final String tono;

    Evento(String id, long ts, String nombre, String hora, String tono) {
        this.id = id;
        this.ts = ts;
        this.nombre = nombre;
        this.hora = hora;
        this.tono = tono;
    }
}
