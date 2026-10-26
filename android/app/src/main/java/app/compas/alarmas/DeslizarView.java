package app.compas.alarmas;

import android.content.Context;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.view.MotionEvent;
import android.view.View;

/**
 * Control de deslizar para detener la alarma, igual que el de la web: un toque o un
 * deslizamiento incompleto no hacen nada; solo se detiene al llegar al extremo y soltar.
 */
final class DeslizarView extends View {
    interface Escuchador {
        void alCompletar();
    }

    private static final float UMBRAL = 0.95f;

    private final float dp;
    private final Paint pistaPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint mangoPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint textoPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint flechaPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Path flecha = new Path();

    private float progreso = 0f;
    private float inicioX = 0f;
    private boolean arrastrando = false;
    private Escuchador escuchador;

    DeslizarView(Context contexto) {
        super(contexto);
        dp = getResources().getDisplayMetrics().density;
        pistaPaint.setColor(0xFFE7EDDF);
        mangoPaint.setColor(0xFF477B5C);
        textoPaint.setColor(0xFF477B5C);
        textoPaint.setTextSize(13f * getResources().getDisplayMetrics().scaledDensity);
        textoPaint.setTextAlign(Paint.Align.CENTER);
        flechaPaint.setColor(0xFFFFFFFF);
        flechaPaint.setStyle(Paint.Style.STROKE);
        flechaPaint.setStrokeWidth(3f * dp);
        flechaPaint.setStrokeCap(Paint.Cap.ROUND);
        flechaPaint.setStrokeJoin(Paint.Join.ROUND);
        setContentDescription("Desliza hasta el extremo derecho para detener la alarma");
    }

    void setEscuchador(Escuchador e) {
        this.escuchador = e;
    }

    private float recorrido() {
        return Math.max(0f, getWidth() - getHeight());
    }

    @Override
    protected void onDraw(Canvas canvas) {
        float w = getWidth();
        float h = getHeight();
        float radio = h / 2f;
        canvas.drawRoundRect(0f, 0f, w, h, radio, radio, pistaPaint);

        float ty = h / 2f - (textoPaint.ascent() + textoPaint.descent()) / 2f;
        canvas.drawText("Desliza para desbloquear", w / 2f + radio / 2f, ty, textoPaint);

        float cx = radio + progreso * recorrido();
        float cy = h / 2f;
        canvas.drawCircle(cx, cy, radio, pistaPaint);
        canvas.drawCircle(cx, cy, radio - 5f * dp, mangoPaint);

        // Dos flechas ">>" dentro del mango.
        float a = 6f * dp;
        flecha.reset();
        flecha.moveTo(cx - 9f * dp, cy - a);
        flecha.lineTo(cx - 3f * dp, cy);
        flecha.lineTo(cx - 9f * dp, cy + a);
        flecha.moveTo(cx + 1f * dp, cy - a);
        flecha.lineTo(cx + 7f * dp, cy);
        flecha.lineTo(cx + 1f * dp, cy + a);
        canvas.drawPath(flecha, flechaPaint);
    }

    @Override
    public boolean onTouchEvent(MotionEvent e) {
        float radio = getHeight() / 2f;
        switch (e.getActionMasked()) {
            case MotionEvent.ACTION_DOWN: {
                float cx = radio + progreso * recorrido();
                if (Math.abs(e.getX() - cx) <= radio * 1.4f && recorrido() > 0f) {
                    arrastrando = true;
                    inicioX = e.getX();
                    getParent().requestDisallowInterceptTouchEvent(true);
                    return true;
                }
                return false;
            }
            case MotionEvent.ACTION_MOVE:
                if (arrastrando) {
                    float p = (e.getX() - inicioX) / recorrido();
                    progreso = Math.max(0f, Math.min(1f, p));
                    invalidate();
                    return true;
                }
                return false;
            case MotionEvent.ACTION_UP:
                if (arrastrando) {
                    arrastrando = false;
                    if (progreso >= UMBRAL) {
                        progreso = 1f;
                        invalidate();
                        performClick();
                        if (escuchador != null) escuchador.alCompletar();
                    } else {
                        progreso = 0f;
                        invalidate();
                    }
                    return true;
                }
                return false;
            case MotionEvent.ACTION_CANCEL:
                if (arrastrando) {
                    arrastrando = false;
                    progreso = 0f;
                    invalidate();
                    return true;
                }
                return false;
            default:
                return super.onTouchEvent(e);
        }
    }

    @Override
    public boolean performClick() {
        return super.performClick();
    }
}
