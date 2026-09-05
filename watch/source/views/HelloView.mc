import Toybox.Graphics;
import Toybox.WatchUi;

//! Minimal placeholder view proving the app renders in the simulator.
class HelloView extends WatchUi.View {

    //! Constructor
    public function initialize() {
        View.initialize();
    }

    //! Load your resources here
    //! @param dc Device context
    public function onLayout(dc as Dc) as Void {
        setLayout(Rez.Layouts.MainLayout(dc));
    }

    //! Update the view
    //! @param dc Device Context
    public function onUpdate(dc as Dc) as Void {
        View.onUpdate(dc);
    }
}
