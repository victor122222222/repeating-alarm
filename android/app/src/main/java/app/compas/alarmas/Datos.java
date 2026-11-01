package app.compas.alarmas;

import java.io.DataInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * Guarda en un archivo del móvil el JSON con las alarmas y las vacaciones de la web.
 * Se escribe en un archivo temporal y se renombra, para no dejar el archivo a medias
 * si la app se cierra mientras guarda. No usa clases de Android para poder probarse.
 */
final class Datos {
    static final String ARCHIVO = "compas-datos.json";
    static final int MAX_BYTES = 2 * 1024 * 1024;

    private Datos() {}

    /** Devuelve el texto guardado, o null si todavía no hay nada guardado. */
    static synchronized String leer(File carpeta) throws IOException {
        File archivo = new File(carpeta, ARCHIVO);
        if (!archivo.exists()) return null;
        long largo = archivo.length();
        if (largo > MAX_BYTES) throw new IOException("Archivo de datos demasiado grande");
        byte[] bytes = new byte[(int) largo];
        try (DataInputStream in = new DataInputStream(new FileInputStream(archivo))) {
            in.readFully(bytes);
        }
        return new String(bytes, StandardCharsets.UTF_8);
    }

    static synchronized void guardar(File carpeta, String texto) throws IOException {
        byte[] bytes = texto.getBytes(StandardCharsets.UTF_8);
        if (bytes.length > MAX_BYTES) throw new IOException("Datos demasiado grandes");
        File temporal = new File(carpeta, ARCHIVO + ".tmp");
        try (FileOutputStream out = new FileOutputStream(temporal)) {
            out.write(bytes);
            out.getFD().sync();
        }
        File destino = new File(carpeta, ARCHIVO);
        if (!temporal.renameTo(destino)) {
            if (destino.exists() && !destino.delete()) {
                throw new IOException("No se pudo reemplazar el archivo de datos");
            }
            if (!temporal.renameTo(destino)) {
                throw new IOException("No se pudo guardar el archivo de datos");
            }
        }
    }
}
