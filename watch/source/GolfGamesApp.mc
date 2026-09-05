import Toybox.Application;
import Toybox.Lang;
import Toybox.WatchUi;

//! Application entry point for the Golf Games watch app.
class GolfGamesApp extends Application.AppBase {

    //! Constructor
    public function initialize() {
        AppBase.initialize();
    }

    //! Handle app startup
    //! @param state Startup arguments
    public function onStart(state as Dictionary?) as Void {
    }

    //! Handle app shutdown
    //! @param state Shutdown arguments
    public function onStop(state as Dictionary?) as Void {
    }

    //! Return the initial view for the app
    //! @return Array [View, Delegate]
    public function getInitialView() as [Views] or [Views, InputDelegates] {
        return [new $.HelloView()];
    }
}

function getApp() as GolfGamesApp {
    return Application.getApp() as GolfGamesApp;
}
