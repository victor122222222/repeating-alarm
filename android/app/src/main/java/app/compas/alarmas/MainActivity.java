package app.compas.alarmas;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/** Muestra la web de Compás y le da acceso a las alarmas nativas del móvil. */
public class MainActivity extends Activity {
    /** Dirección de la web. Cámbiala aquí si la publicas en otro dominio. */
    static final String URL_WEB = "file:///android_asset/index.html";

    private WebView web;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);

        web = new WebView(this);
        setContentView(web);

        WebSettings ajustes = web.getSettings();
        ajustes.setJavaScriptEnabled(true);
        ajustes.setDomStorageEnabled(true);
        ajustes.setMediaPlaybackRequiresUserGesture(false);
        CookieManager.getInstance().setAcceptCookie(true);

        final String host = Uri.parse(URL_WEB).getHost();
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView vista, WebResourceRequest peticion) {
                Uri destino = peticion.getUrl();
                if (host != null && host.equals(destino.getHost())) {
                    return false;
                }
                // Los enlaces a otras webs se abren fuera, para que no tengan acceso al puente.
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, destino));
                } catch (RuntimeException ignorada) {
                    // Sin aplicación para abrirlo.
                }
                return true;
            }
        });
        web.addJavascriptInterface(new PuenteNativo(getApplicationContext()), "CompasNativo");

        if (estado != null) {
            web.restoreState(estado);
        } else {
            web.loadUrl(URL_WEB);
        }

        // La primera vez, guiamos al usuario por los ajustes que hacen falta para que
        // la alarma suene con el móvil bloqueado.
        SharedPreferences prefs = getSharedPreferences("compas_app", Context.MODE_PRIVATE);
        if (!prefs.getBoolean("ajustes_vistos", false)) {
            prefs.edit().putBoolean("ajustes_vistos", true).apply();
            startActivity(new Intent(this, AjustesActivity.class));
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle salida) {
        super.onSaveInstanceState(salida);
        web.saveState(salida);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
    }

    @Override
    protected void onPause() {
        // Guarda ya la cookie del dispositivo: es la que identifica tus alarmas en el servidor.
        CookieManager.getInstance().flush();
        web.onPause();
        super.onPause();
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        web.removeJavascriptInterface("CompasNativo");
        web.destroy();
        super.onDestroy();
    }
}
