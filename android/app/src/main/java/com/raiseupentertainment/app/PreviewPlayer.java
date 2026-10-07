package com.raiseupentertainment.app;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Handler;
import android.os.Looper;

public final class PreviewPlayer {
    public interface Listener { void status(String message, boolean playing); }
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Listener listener;
    private final Context context;
    private MediaPlayer player;
    private String title = "";
    private boolean prepared;
    private final Runnable limit = new Runnable() {
        @Override public void run() {
            if (player == null || !prepared) return;
            try {
                if (player.getCurrentPosition() >= 45000) stop();
                else if (player.isPlaying()) handler.postDelayed(this, 200);
            } catch (IllegalStateException error) { stop(); }
        }
    };
    public PreviewPlayer(Context context, Listener listener) {
        this.context = context.getApplicationContext(); this.listener = listener;
    }
    public void play(CatalogProduct product) {
        if (!ProductPolicy.allowedPreview(product.previewUrl)) { listener.status("Preview unavailable", false); return; }
        stop(); title = product.title;
        MediaPlayer current = new MediaPlayer(); player = current;
        current.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
        current.setOnPreparedListener(media -> {
            if (player != media) return;
            prepared = true; media.start(); listener.status("Playing: " + title, true); handler.post(limit);
        });
        current.setOnCompletionListener(media -> { if (player == media) stop(); });
        current.setOnErrorListener((media, what, extra) -> { if (player == media) { stop(); listener.status("Preview could not play. Check your connection and try again.", false); } return true; });
        try {
            String path = Uri.parse(product.previewUrl).getPath();
            String filename = path == null ? "" : path.substring(path.lastIndexOf('/') + 1);
            boolean bundled = false;
            if (filename.matches("[a-z0-9-]+\\.mp3")) {
                try (AssetFileDescriptor preview = context.getAssets().openFd("previews/" + filename)) {
                    current.setDataSource(preview.getFileDescriptor(), preview.getStartOffset(), preview.getLength());
                    bundled = true;
                } catch (java.io.FileNotFoundException missing) { /* A future preview can load from the approved website. */ }
            }
            if (!bundled) current.setDataSource(product.previewUrl);
            current.prepareAsync(); listener.status("Loading: " + title, false);
        }
        catch (Exception error) { stop(); listener.status("Preview unavailable", false); }
    }
    public void toggle() {
        if (player == null || !prepared) return;
        try {
            if (player.isPlaying()) { player.pause(); handler.removeCallbacks(limit); listener.status("Paused: " + title, false); }
            else { player.start(); listener.status("Playing: " + title, true); handler.post(limit); }
        } catch (IllegalStateException error) { stop(); }
    }
    public void stop() {
        handler.removeCallbacks(limit);
        if (player != null) { player.release(); player = null; }
        prepared = false; listener.status("Choose a preview", false);
    }
}
