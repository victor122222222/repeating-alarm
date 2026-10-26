package app.compas.alarmas;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import java.util.Locale;

/** Atajos a los ajustes del móvil que afectan a que la alarma suene con la pantalla bloqueada. */
final class Ajustes {
    private Ajustes() {}

    static boolean esXiaomi() {
        String f = Build.MANUFACTURER == null ? "" : Build.MANUFACTURER.toLowerCase(Locale.ROOT);
        return f.contains("xiaomi") || f.contains("redmi") || f.contains("poco");
    }

    static void abrir(Context c, String tipo) {
        Intent principal = construir(c, tipo);
        if (!lanzar(c, principal)) {
            lanzar(c, detallesDeLaApp(c));
        }
    }

    private static boolean lanzar(Context c, Intent i) {
        if (i == null) return false;
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            c.startActivity(i);
            return true;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private static Intent detallesDeLaApp(Context c) {
        return new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + c.getPackageName()));
    }

    private static Intent construir(Context c, String tipo) {
        String paquete = c.getPackageName();
        if (tipo == null) tipo = "app";
        switch (tipo) {
            case "ajustes":
                return new Intent(c, AjustesActivity.class);
            case "notificaciones":
                return new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                        .putExtra(Settings.EXTRA_APP_PACKAGE, paquete);
            case "pantallaCompleta":
                if (Build.VERSION.SDK_INT >= 34) {
                    return new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
                            Uri.parse("package:" + paquete));
                }
                return detallesDeLaApp(c);
            case "bateria":
                return new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
                        Uri.parse("package:" + paquete));
            case "inicioAutomatico":
                return new Intent().setComponent(new ComponentName("com.miui.securitycenter",
                        "com.miui.permcenter.autostart.AutoStartManagementActivity"));
            case "permisosXiaomi":
                return new Intent("miui.intent.action.APP_PERM_EDITOR")
                        .setClassName("com.miui.securitycenter",
                                "com.miui.permcenter.permissions.PermissionsEditorActivity")
                        .putExtra("extra_pkgname", paquete);
            default:
                return detallesDeLaApp(c);
        }
    }
}
