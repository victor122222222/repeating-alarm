package app.compas.alarmas;

import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.PowerManager;
import android.webkit.JavascriptInterface;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Funciones que la web puede llamar como window.CompasNativo.*. Todo son textos JSON,
 * porque el puente de WebView solo admite tipos sencillos.
 */
public class PuenteNativo {
    private final Context contexto;

    PuenteNativo(Context contexto) {
        this.contexto = contexto;
    }

    /**
     * Sustituye la lista de próximas alarmas. Recibe un JSON con una lista de objetos
     * {id, ts (milisegundos desde 1970), nombre, hora ("HH:MM"), tono}.
     * Devuelve {"ok":true,"total":n,"proxima":ts|null} o {"ok":false,"error":"..."}.
     */
    @JavascriptInterface
    public String programar(String json) {
        try {
            JSONArray arr = new JSONArray(json);
            if (arr.length() > Almacen.MAX_EVENTOS) {
                return error("Demasiadas alarmas (máximo " + Almacen.MAX_EVENTOS + ").");
            }
            List<Evento> lista = new ArrayList<>();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                long ts = o.getLong("ts");
                if (ts <= 0) return error("Fecha no válida.");
                String nombre = o.optString("nombre", "Alarma").trim();
                if (nombre.isEmpty()) nombre = "Alarma";
                if (nombre.length() > 60) nombre = nombre.substring(0, 60);
                String hora = o.optString("hora", "");
                if (!hora.matches("^([01]\\d|2[0-3]):[0-5]\\d$")) return error("Hora no válida.");
                String tono = o.optString("tono", "Sirena");
                if (!Tono.esConocido(tono)) tono = "Sirena";
                lista.add(new Evento(o.optString("id", "evento" + i), ts, nombre, hora, tono));
            }
            Almacen.guardar(contexto, lista);
            Programador.programarSiguiente(contexto);
            JSONObject r = new JSONObject();
            r.put("ok", true);
            r.put("total", lista.size());
            Evento sig = Programador.buscarSiguiente(contexto, System.currentTimeMillis());
            r.put("proxima", sig != null ? sig.ts : JSONObject.NULL);
            return r.toString();
        } catch (JSONException ex) {
            return error("Datos de alarmas no válidos.");
        }
    }

    /** Quita todas las alarmas programadas. */
    @JavascriptInterface
    public void cancelarTodas() {
        Programador.cancelarTodas(contexto);
    }

    /** Estado de los permisos y de la próxima alarma, en JSON. */
    @JavascriptInterface
    public String estado() {
        try {
            JSONObject o = new JSONObject();
            o.put("nativa", true);
            o.put("version", "1.0.0");
            o.put("fabricante", Build.MANUFACTURER);
            NotificationManager nm = (NotificationManager)
                    contexto.getSystemService(Context.NOTIFICATION_SERVICE);
            o.put("notificaciones", nm != null && nm.areNotificationsEnabled());
            o.put("pantallaCompleta",
                    Build.VERSION.SDK_INT < 34 || (nm != null && nm.canUseFullScreenIntent()));
            PowerManager pm = (PowerManager) contexto.getSystemService(Context.POWER_SERVICE);
            o.put("bateria", pm != null && pm.isIgnoringBatteryOptimizations(contexto.getPackageName()));
            o.put("alarmasExactas", Programador.puedeProgramarExactas(contexto));
            List<Evento> lista = Almacen.leer(contexto);
            o.put("total", lista.size());
            o.put("hasta", lista.isEmpty() ? JSONObject.NULL : lista.get(lista.size() - 1).ts);
            Evento sig = Programador.buscarSiguiente(contexto, System.currentTimeMillis());
            o.put("proxima", sig != null ? sig.ts : JSONObject.NULL);
            return o.toString();
        } catch (JSONException ex) {
            return error("No se pudo leer el estado.");
        }
    }

    /**
     * Abre un ajuste del móvil. Valores: "ajustes" (la pantalla guiada de Compás),
     * "notificaciones", "pantallaCompleta", "bateria", "inicioAutomatico", "permisosXiaomi", "app".
     */
    @JavascriptInterface
    public void abrir(String tipo) {
        Ajustes.abrir(contexto, tipo);
    }

    /** Hace sonar una alarma de prueba dentro de unos segundos. */
    @JavascriptInterface
    public void probar(String tono) {
        Programador.programarPrueba(contexto, Tono.esConocido(tono) ? tono : "Sirena");
    }

    private static String error(String mensaje) {
        try {
            JSONObject o = new JSONObject();
            o.put("ok", false);
            o.put("error", mensaje);
            return o.toString();
        } catch (JSONException ex) {
            return "{\"ok\":false}";
        }
    }
}
