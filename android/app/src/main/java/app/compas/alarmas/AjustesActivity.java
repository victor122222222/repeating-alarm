package app.compas.alarmas;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Typeface;
import android.os.Build;
import android.os.PowerManager;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

/**
 * Lista guiada de los ajustes que hacen falta para que la alarma suene con el móvil
 * bloqueado. Se vuelve a dibujar al volver de cada ajuste, para ver qué ya está hecho.
 */
public class AjustesActivity extends Activity {
    private LinearLayout lista;

    @Override
    protected void onCreate(android.os.Bundle estado) {
        super.onCreate(estado);
        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(0xFFF6F8F1);
        lista = new LinearLayout(this);
        lista.setOrientation(LinearLayout.VERTICAL);
        lista.setPadding(dp(20), dp(24), dp(20), dp(32));
        scroll.addView(lista, new ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        setContentView(scroll);
    }

    @Override
    protected void onResume() {
        super.onResume();
        dibujar();
    }

    private int dp(int valor) {
        return Math.round(valor * getResources().getDisplayMetrics().density);
    }

    private void dibujar() {
        lista.removeAllViews();
        texto("Preparar las alarmas", 24f, 0xFF292D29, true, 0);
        texto("Para que suenen con el móvil bloqueado, Android necesita estos permisos. "
                + "Cada uno se marca solo cuando está listo.", 14f, 0xFF697262, false, 8);

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);

        boolean avisos = nm != null && nm.areNotificationsEnabled();
        fila("1. Avisos", avisos,
                "Sin avisos, Android no deja mostrar la pantalla de alarma.",
                "Permitir avisos", new Runnable() {
                    @Override
                    public void run() {
                        pedirAvisos();
                    }
                });

        if (Build.VERSION.SDK_INT >= 34) {
            boolean completa = nm != null && nm.canUseFullScreenIntent();
            fila("2. Alarma a pantalla completa", completa,
                    "Permite que la alarma aparezca encima de la pantalla de bloqueo.",
                    "Abrir ajuste", new Runnable() {
                        @Override
                        public void run() {
                            Ajustes.abrir(AjustesActivity.this, "pantallaCompleta");
                        }
                    });
        }

        boolean bateria = pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
        fila("3. Batería sin restricciones", bateria,
                "Evita que el ahorro de batería cierre la app y se pierdan las alarmas.",
                "Quitar restricciones", new Runnable() {
                    @Override
                    public void run() {
                        Ajustes.abrir(AjustesActivity.this, "bateria");
                    }
                });

        if (Ajustes.esXiaomi()) {
            filaSinComprobar("4. Inicio automático (Xiaomi)",
                    "Actívalo para Compás. Xiaomi no deja comprobarlo desde la app.",
                    "Abrir inicio automático", new Runnable() {
                        @Override
                        public void run() {
                            Ajustes.abrir(AjustesActivity.this, "inicioAutomatico");
                        }
                    });
            filaSinComprobar("5. Permisos de Xiaomi",
                    "Activa \"Mostrar en la pantalla de bloqueo\" y \"Mostrar ventanas emergentes "
                            + "mientras se ejecuta en segundo plano\". En Ahorro de batería de la app, "
                            + "elige \"Sin restricciones\".",
                    "Abrir permisos", new Runnable() {
                        @Override
                        public void run() {
                            Ajustes.abrir(AjustesActivity.this, "permisosXiaomi");
                        }
                    });
            filaSinComprobar("6. Fijar la app en Recientes",
                    "Abre Recientes, mantén pulsada la tarjeta de Compás y toca el candado. "
                            + "Así Xiaomi no la cierra al limpiar aplicaciones.",
                    null, null);
        }

        filaSinComprobar("Probar ahora",
                "Suena a los 8 segundos. Pulsa el botón y bloquea el móvil enseguida.",
                "Probar alarma", new Runnable() {
                    @Override
                    public void run() {
                        Programador.programarPrueba(AjustesActivity.this, "Sirena");
                        Toast.makeText(AjustesActivity.this,
                                "Suena en 8 segundos. Bloquea el móvil.", Toast.LENGTH_LONG).show();
                    }
                });
    }

    private void pedirAvisos() {
        SharedPreferences prefs = getSharedPreferences("compas_app", Context.MODE_PRIVATE);
        boolean yaPedido = prefs.getBoolean("avisos_pedidos", false);
        if (Build.VERSION.SDK_INT >= 33 && !yaPedido
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            prefs.edit().putBoolean("avisos_pedidos", true).apply();
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        } else {
            Ajustes.abrir(this, "notificaciones");
        }
    }

    @Override
    public void onRequestPermissionsResult(int codigo, String[] permisos, int[] resultados) {
        super.onRequestPermissionsResult(codigo, permisos, resultados);
        dibujar();
    }

    private TextView texto(String t, float tamano, int color, boolean negrita, int margenArriba) {
        TextView v = new TextView(this);
        v.setText(t);
        v.setTextSize(tamano);
        v.setTextColor(color);
        if (negrita) v.setTypeface(Typeface.DEFAULT_BOLD);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(margenArriba);
        lista.addView(v, lp);
        return v;
    }

    private void fila(String titulo, boolean listo, String ayuda, String boton, Runnable accion) {
        texto(titulo, 16f, 0xFF292D29, true, 22);
        texto(listo ? "✓ Listo" : "✗ Falta por activar", 13f,
                listo ? 0xFF477B5C : 0xFFB3402A, true, 4);
        texto(ayuda, 13f, 0xFF697262, false, 4);
        if (!listo) boton(boton, accion);
    }

    private void filaSinComprobar(String titulo, String ayuda, String boton, Runnable accion) {
        texto(titulo, 16f, 0xFF292D29, true, 22);
        texto(ayuda, 13f, 0xFF697262, false, 4);
        if (boton != null) boton(boton, accion);
    }

    private void boton(String t, final Runnable accion) {
        Button b = new Button(this);
        b.setText(t);
        b.setAllCaps(false);
        b.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                accion.run();
            }
        });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(8);
        lista.addView(b, lp);
    }
}
