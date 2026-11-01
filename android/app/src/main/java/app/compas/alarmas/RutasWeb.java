package app.compas.alarmas;

import java.util.Locale;

/**
 * Reglas para servir la web que va dentro de la app (carpeta assets/web). Sin clases de
 * Android, para poder probarlas.
 */
final class RutasWeb {
    static final String CARPETA = "web";

    private RutasWeb() {}

    /**
     * Ruta del recurso dentro de assets a partir de la ruta ya decodificada de la dirección
     * (por ejemplo "/assets/index-ab12.js"). Devuelve null si la ruta no es segura.
     */
    static String rutaAsset(String rutaUrl) {
        String ruta = (rutaUrl == null || rutaUrl.isEmpty() || rutaUrl.equals("/"))
                ? "/index.html" : rutaUrl;
        if (!ruta.startsWith("/")) return null;
        if (ruta.contains("..") || ruta.contains("\\") || ruta.contains("//")
                || ruta.indexOf('\0') >= 0) {
            return null;
        }
        return CARPETA + ruta;
    }

    static String tipoMime(String ruta) {
        int punto = ruta.lastIndexOf('.');
        String ext = punto < 0 ? "" : ruta.substring(punto + 1).toLowerCase(Locale.ROOT);
        switch (ext) {
            case "html": return "text/html";
            case "js":
            case "mjs": return "text/javascript";
            case "css": return "text/css";
            case "json":
            case "map": return "application/json";
            case "svg": return "image/svg+xml";
            case "png": return "image/png";
            case "jpg":
            case "jpeg": return "image/jpeg";
            case "webp": return "image/webp";
            case "ico": return "image/x-icon";
            case "woff2": return "font/woff2";
            case "woff": return "font/woff";
            case "txt": return "text/plain";
            default: return "application/octet-stream";
        }
    }

    static boolean esTexto(String mime) {
        return mime.startsWith("text/") || mime.equals("application/json")
                || mime.equals("image/svg+xml");
    }
}
