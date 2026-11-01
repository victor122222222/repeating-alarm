package app.compas.alarmas;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * Muestra la web de Compás, que va dentro de la app (assets/web), y le da acceso a las
 * alarmas nativas del móvil y al guardado de datos. No necesita ningún servidor.
 */
public class MainActivity extends Activity {
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
        ajustes.setAllowFileAccess(false);
        ajustes.setAllowContentAccess(false);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView vista,
                                                              WebResourceRequest peticion) {
                Uri destino = peticion.getUrl();
                if (RecursosWeb.esNuestra(destino) && "GET".equals(peticion.getMethod())) {
                    return RecursosWeb.responder(getAssets(), destino);
                }
                return null;
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView vista, WebResourceRequest peticion) {
                Uri destino = peticion.getUrl();
                if (RecursosWeb.esNuestra(destino)) {
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
            web.loadUrl(RecursosWeb.INICIO);
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
