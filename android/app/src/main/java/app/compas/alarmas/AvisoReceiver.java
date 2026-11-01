package app.compas.alarmas;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Se activa 12 horas antes de la próxima alarma para publicar el aviso. */
public class AvisoReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        ProximaAlarma.actualizar(context);
    }
}
