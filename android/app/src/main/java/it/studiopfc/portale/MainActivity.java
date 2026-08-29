package it.studiopfc.portale;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String CHANNEL_ID = "pfc-alerts-v2";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Il canale DEVE esistere prima che FCM riceva il primo messaggio,
        // altrimenti Android 8+ scarta la notifica silenziosamente.
        createNotificationChannel();
        super.onCreate(savedInstanceState);
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm == null) return;
            // Se esiste già, non fa nulla (idempotente)
            if (nm.getNotificationChannel(CHANNEL_ID) != null) return;

            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Avvisi Portale PFC",
                NotificationManager.IMPORTANCE_HIGH   // heads-up + suono
            );
            channel.setDescription("Scadenze, messaggi e avvisi dello studio");
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setLockscreenVisibility(NotificationManager.IMPORTANCE_HIGH);

            // Suono di sistema (RingtoneManager) — non un file resource inesistente
            Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            AudioAttributes audio = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .build();
            channel.setSound(sound, audio);

            nm.createNotificationChannel(channel);
        }
    }
}

