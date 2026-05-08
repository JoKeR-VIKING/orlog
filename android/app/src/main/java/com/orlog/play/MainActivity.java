package com.orlog.play;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "OrlogPlayGames";
    private static final long PLAY_GAMES_AUTH_DELAY_MS = 600;
    private GamesSignInClient gamesSignInClient;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable automaticSignInCheck = this::checkIfAutomaticallySignedIn;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        PlayGamesSdk.initialize(this);
        gamesSignInClient = PlayGames.getGamesSignInClient(this);
        registerPlugin(PlayGamesAchievementsPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        mainHandler.postDelayed(automaticSignInCheck, PLAY_GAMES_AUTH_DELAY_MS);
    }

    @Override
    public void onPause() {
        mainHandler.removeCallbacks(automaticSignInCheck);
        super.onPause();
    }

    private void checkIfAutomaticallySignedIn() {
        if (gamesSignInClient == null) {
            gamesSignInClient = PlayGames.getGamesSignInClient(this);
        }
        gamesSignInClient.isAuthenticated()
            .addOnSuccessListener(result ->
                Log.i(TAG, "Automatic Play Games auth check: authenticated=" + result.isAuthenticated()))
            .addOnFailureListener(error ->
                Log.w(TAG, "Automatic Play Games auth check failed.", error));
    }
}
