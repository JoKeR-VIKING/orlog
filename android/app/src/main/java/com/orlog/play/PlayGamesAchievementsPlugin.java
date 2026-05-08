package com.orlog.play;

import android.app.Activity;
import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.games.GamesSignInClient;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.PlayGamesSdk;

@CapacitorPlugin(name = "PlayGamesAchievements")
public class PlayGamesAchievementsPlugin extends Plugin {
    @Override
    public void load() {
        try {
            PlayGamesSdk.initialize(getContext());
        } catch (Exception ignored) {
            // Calls below will reject if Play Games is not configured correctly.
        }
    }

    @PluginMethod
    public void isAuthenticated(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is not available.");
            return;
        }
        PlayGames.getGamesSignInClient(activity).isAuthenticated()
            .addOnSuccessListener(result -> resolveAuth(call, result.isAuthenticated()))
            .addOnFailureListener(error -> call.reject("Unable to check Play Games authentication.", error));
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is not available.");
            return;
        }
        PlayGames.getGamesSignInClient(activity).signIn()
            .addOnSuccessListener(result -> resolveAuth(call, result.isAuthenticated()))
            .addOnFailureListener(error -> call.reject("Unable to sign in to Play Games.", error));
    }

    @PluginMethod
    public void unlock(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is not available.");
            return;
        }
        String achievementId = call.getString("achievementId", "");
        if (achievementId.isEmpty()) {
            call.reject("achievementId is required.");
            return;
        }
        runWhenAuthenticated(call, activity, false, () -> {
            PlayGames.getAchievementsClient(activity).unlock(achievementId);
            call.resolve();
        });
    }

    @PluginMethod
    public void increment(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is not available.");
            return;
        }
        String achievementId = call.getString("achievementId", "");
        int steps = call.getInt("steps", 1);
        if (achievementId.isEmpty()) {
            call.reject("achievementId is required.");
            return;
        }
        if (steps <= 0) {
            call.resolve();
            return;
        }
        runWhenAuthenticated(call, activity, false, () -> {
            PlayGames.getAchievementsClient(activity).increment(achievementId, steps);
            call.resolve();
        });
    }

    @PluginMethod
    public void showAchievements(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is not available.");
            return;
        }

        runWhenAuthenticated(call, activity, true, () -> openAchievements(call, activity));
    }

    @PluginMethod
    public void submitLeaderboardScore(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is not available.");
            return;
        }
        String leaderboardId = call.getString("leaderboardId", "");
        int score = call.getInt("score", 0);
        if (leaderboardId.isEmpty()) {
            call.reject("leaderboardId is required.");
            return;
        }
        if (score <= 0) {
            call.resolve();
            return;
        }
        runWhenAuthenticated(call, activity, false, () -> {
            PlayGames.getLeaderboardsClient(activity).submitScore(leaderboardId, score);
            call.resolve();
        });
    }

    @PluginMethod
    public void showLeaderboard(PluginCall call) {
        Activity activity = getActivity();
        if (activity == null) {
            call.reject("Activity is not available.");
            return;
        }
        String leaderboardId = call.getString("leaderboardId", "");
        if (leaderboardId.isEmpty()) {
            call.reject("leaderboardId is required.");
            return;
        }
        runWhenAuthenticated(call, activity, true, () -> openLeaderboard(call, activity, leaderboardId));
    }

    private void runWhenAuthenticated(PluginCall call, Activity activity, boolean interactive, Runnable action) {
        GamesSignInClient signInClient = PlayGames.getGamesSignInClient(activity);
        signInClient.isAuthenticated()
            .addOnSuccessListener(result -> {
                if (result.isAuthenticated()) {
                    action.run();
                    return;
                }
                if (!interactive) {
                    call.reject("Play Games is not authenticated.");
                    return;
                }
                signInClient.signIn()
                    .addOnSuccessListener(signInResult -> {
                        if (signInResult.isAuthenticated()) {
                            action.run();
                        } else {
                            call.reject("Play Games sign-in is required.");
                        }
                    })
                    .addOnFailureListener(error -> call.reject("Unable to sign in to Play Games.", error));
            })
            .addOnFailureListener(error -> call.reject("Unable to check Play Games authentication.", error));
    }

    @ActivityCallback
    private void showAchievementsResult(PluginCall call, Intent result) {
        if (call != null) call.resolve();
    }

    private void openAchievements(PluginCall call, Activity activity) {
        PlayGames.getAchievementsClient(activity).getAchievementsIntent()
            .addOnSuccessListener(intent -> startActivityForResult(call, intent, "showAchievementsResult"))
            .addOnFailureListener(error -> call.reject("Unable to show Play Games achievements.", error));
    }

    private void openLeaderboard(PluginCall call, Activity activity, String leaderboardId) {
        PlayGames.getLeaderboardsClient(activity).getLeaderboardIntent(leaderboardId)
            .addOnSuccessListener(intent -> startActivityForResult(call, intent, "showLeaderboardResult"))
            .addOnFailureListener(error -> call.reject("Unable to show Play Games leaderboard.", error));
    }

    @ActivityCallback
    private void showLeaderboardResult(PluginCall call, Intent result) {
        if (call != null) call.resolve();
    }

    private void resolveAuth(PluginCall call, boolean authenticated) {
        JSObject result = new JSObject();
        result.put("authenticated", authenticated);
        call.resolve(result);
    }
}
