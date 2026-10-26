package app.compas.alarmas;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Pantalla de alarma que aparece encima del bloqueo y se cierra al deslizar. */
public class AlarmRingActivity extends Activity {
    private TextView txtHora;
    private TextView txtNombre;
    private boolean registrado = false;

    private final BroadcastReceiver alParar = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            finish();
        }
    };

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        if (!AlarmService.activo) {
            // La alarma ya se detuvo (por ejemplo, se tocó una notificación antigua).
            finish();
            return;
        }

        construirVista();
        mostrar(getIntent());

        IntentFilter filtro = new IntentFilter(AlarmService.ACCION_PARADA);
        if (Build.VERSION.SDK_INT >= 33) {
            registerReceiver(alParar, filtro, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(alParar, filtro);
        }
        registrado = true;
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (txtHora != null) mostrar(intent);
    }

    private void mostrar(Intent intent) {
        String hora = intent != null ? intent.getStringExtra("hora") : null;
        String nombre = intent != null ? intent.getStringExtra("nombre") : null;
        txtHora.setText(hora != null ? hora : "");
        txtNombre.setText(nombre != null ? nombre : "Alarma");
    }

    private int dp(int valor) {
        return Math.round(valor * getResources().getDisplayMetrics().density);
    }

    private void construirVista() {
        LinearLayout raiz = new LinearLayout(this);
        raiz.setOrientation(LinearLayout.VERTICAL);
        raiz.setGravity(Gravity.CENTER);
        raiz.setBackgroundColor(0xFFF6F8F1);
        raiz.setPadding(dp(24), dp(24), dp(24), dp(24));

        TextView icono = new TextView(this);
        icono.setText("⏰");
        icono.setTextSize(32f);
        icono.setGravity(Gravity.CENTER);
        GradientDrawable circulo = new GradientDrawable();
        circulo.setShape(GradientDrawable.OVAL);
        circulo.setColor(0xFFE4EDDC);
        icono.setBackground(circulo);
        raiz.addView(icono, new LinearLayout.LayoutParams(dp(72), dp(72)));

        txtHora = new TextView(this);
        txtHora.setTextSize(64f);
        txtHora.setTypeface(Typeface.DEFAULT_BOLD);
        txtHora.setTextColor(0xFF292D29);
        txtHora.setLetterSpacing(-0.04f);
        txtHora.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lpHora = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lpHora.topMargin = dp(12);
        raiz.addView(txtHora, lpHora);

        txtNombre = new TextView(this);
        txtNombre.setTextSize(17f);
        txtNombre.setTextColor(0xFF292D29);
        txtNombre.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lpNombre = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lpNombre.topMargin = dp(8);
        raiz.addView(txtNombre, lpNombre);

        TextView mensaje = new TextView(this);
        mensaje.setText("La alarma sigue sonando hasta que la desbloquees.");
        mensaje.setTextSize(13f);
        mensaje.setTextColor(0xFF697262);
        mensaje.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lpMensaje = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lpMensaje.topMargin = dp(16);
        raiz.addView(mensaje, lpMensaje);

        DeslizarView deslizar = new DeslizarView(this);
        deslizar.setEscuchador(new DeslizarView.Escuchador() {
            @Override
            public void alCompletar() {
                AlarmService.parar();
                finish();
            }
        });
        LinearLayout.LayoutParams lpDeslizar = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, dp(64));
        lpDeslizar.topMargin = dp(32);
        raiz.addView(deslizar, lpDeslizar);

        TextView pista = new TextView(this);
        pista.setText("Arrastra la flecha hasta el extremo derecho y suelta.");
        pista.setTextSize(11f);
        pista.setTextColor(0xFF7C827A);
        pista.setGravity(Gravity.CENTER);
        LinearLayout.LayoutParams lpPista = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lpPista.topMargin = dp(12);
        raiz.addView(pista, lpPista);

        setContentView(raiz);
    }

    /** Ni el botón atrás ni el de volumen detienen la alarma: solo el deslizamiento. */
    @Override
    public void onBackPressed() {
        // Sin acción.
    }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) return true;
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onDestroy() {
        if (registrado) {
            unregisterReceiver(alParar);
            registrado = false;
        }
        super.onDestroy();
    }
}
