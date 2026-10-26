package app.compas.alarmas;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Vuelve a programar la siguiente alarma tras reiniciar, actualizar la app o cambiar la hora. */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        Programador.programarSiguiente(context);
    }
}
