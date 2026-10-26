package app.compas.alarmas;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

/**
 * Guarda la lista de próximas alarmas. Usa el almacenamiento protegido del dispositivo
 * para que se pueda leer al reiniciar, incluso antes de que el usuario desbloquee el móvil.
 */
final class Almacen {
    private static final String ARCHIVO = "compas_eventos";
    private static final String CLAVE_EVENTOS = "eventos";
    private static final String CLAVE_ULTIMO = "ultimo";
    static final int MAX_EVENTOS = 3000;

    private Almacen() {}

    private static SharedPreferences prefs(Context c) {
        Context ctx = c.getApplicationContext() != null ? c.getApplicationContext() : c;
        if (Build.VERSION.SDK_INT >= 24) {
            ctx = ctx.createDeviceProtectedStorageContext();
        }
        return ctx.getSharedPreferences(ARCHIVO, Context.MODE_PRIVATE);
    }

    static synchronized void guardar(Context c, List<Evento> lista) {
        JSONArray arr = new JSONArray();
        try {
            for (Evento e : lista) {
                JSONObject o = new JSONObject();
                o.put("id", e.id);
                o.put("ts", e.ts);
                o.put("nombre", e.nombre);
                o.put("hora", e.hora);
                o.put("tono", e.tono);
                arr.put(o);
            }
        } catch (JSONException ex) {
            return;
        }
        prefs(c).edit().putString(CLAVE_EVENTOS, arr.toString()).commit();
    }

    static synchronized List<Evento> leer(Context c) {
        List<Evento> lista = new ArrayList<>();
        String texto = prefs(c).getString(CLAVE_EVENTOS, "[]");
        try {
            JSONArray arr = new JSONArray(texto);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                lista.add(new Evento(
                        o.getString("id"),
                        o.getLong("ts"),
                        o.getString("nombre"),
                        o.getString("hora"),
                        o.getString("tono")));
            }
        } catch (JSONException ex) {
            return new ArrayList<>();
        }
        Collections.sort(lista, new Comparator<Evento>() {
            @Override
            public int compare(Evento a, Evento b) {
                return Long.compare(a.ts, b.ts);
            }
        });
        return lista;
    }

    /** Marca de la última alarma que ya sonó, para no repetirla tras un reinicio. */
    static synchronized long ultimo(Context c) {
        return prefs(c).getLong(CLAVE_ULTIMO, 0L);
    }

    static synchronized void marcarUltimo(Context c, long ts) {
        prefs(c).edit().putLong(CLAVE_ULTIMO, ts).commit();
    }
}
