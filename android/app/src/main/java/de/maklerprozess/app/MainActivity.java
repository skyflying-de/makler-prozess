package de.maklerprozess.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Eigene Erweiterung: Cloud-Zugriffe nativ (WebDAV-Methoden, ohne Browser-Sperren)
        registerPlugin(NativeHttpPlugin.class);
        // Ordner-Modus: gewählter, von einer Sync-App abgeglichener Ordner (Speicherzugriffs-Framework)
        registerPlugin(FolderAccessPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
