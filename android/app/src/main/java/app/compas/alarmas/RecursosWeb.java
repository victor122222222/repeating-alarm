package app.compas.alarmas;

import android.content.res.AssetManager;
import android.net.Uri;
import android.webkit.WebResourceResponse;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;

/**
 * Sirve la web que va dentro de la app (assets/web) como si fuera una página https normal,
 * en un dominio reservado para esto. Así los módulos de JavaScript funcionan, cosa que no
 * ocurre con file:///android_asset/.
 */
final class RecursosWeb {
    /** Dominio reservado por Android para servir recursos locales; nunca sale a internet. */
    static final String HOST = "appassets.androidplatform.net";
    static final String INICIO = "https://" + HOST + "/index.html";

    private RecursosWeb() {}

    static boolean esNuestra(Uri uri) {
        return uri != null && "https".equals(uri.getScheme()) && HOST.equals(uri.getHost());
    }

    static WebResourceResponse responder(AssetManager assets, Uri uri) {
        String ruta = RutasWeb.rutaAsset(uri.getPath());
        if (ruta == null) return error(400, "Solicitud no válida");
        try {
            InputStream datos = assets.open(ruta);
            String mime = RutasWeb.tipoMime(ruta);
            return new WebResourceResponse(mime, RutasWeb.esTexto(mime) ? "utf-8" : null, datos);
        } catch (IOException ex) {
            return error(404, "No encontrado");
        }
    }

    private static WebResourceResponse error(int codigo, String motivo) {
        return new WebResourceResponse("text/plain", "utf-8", codigo, motivo,
                new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }
}
