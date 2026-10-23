// Put the qm menu at the mouse pointer.
//
// This exists because nothing outside the compositor can do it. On Wayland a
// client may not place its own surface, and there is no protocol to ask where
// the pointer is outside your own windows. xdotool answers under XWayland but
// its answer is stale - it only learns the pointer from X11 clients, so with
// Wayland-native apps under the cursor it returns the same coordinates for
// hours.
//
// Inside the shell both halves are available: global.get_pointer() is the
// real position, and Mutter can move any window, Wayland clients included.
//
// No UI, no timers, no signal handlers: one D-Bus method that runs only when
// qm calls it.

import Gio from 'gi://Gio';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const PATH = '/org/gnome/Shell/Extensions/QmPlace';

const IFACE = `
<node>
  <interface name="org.gnome.Shell.Extensions.QmPlace">
    <method name="PlaceAtPointer">
      <arg type="s" direction="in"  name="title"/>
      <arg type="i" direction="in"  name="gap"/>
      <arg type="b" direction="out" name="placed"/>
    </method>
    <method name="Pointer">
      <arg type="i" direction="out" name="x"/>
      <arg type="i" direction="out" name="y"/>
    </method>
  </interface>
</node>`;

class Service {
    Pointer() {
        const [x, y] = global.get_pointer();
        return [x, y];
    }

    PlaceAtPointer(title, gap) {
        const window = global.get_window_actors()
            .map(actor => actor.get_meta_window())
            .find(w => w && w.get_title && w.get_title() === title);
        if (!window)
            return false;

        const [px, py] = global.get_pointer();
        const frame = window.get_frame_rect();

        // get_current_monitor() is the monitor holding the pointer, so this
        // is right on a multi-head setup without any rectangle arithmetic.
        const area = global.display.get_monitor_geometry(
            global.display.get_current_monitor());

        // Flip to the other side at an edge rather than sliding along it:
        // clamping alone leaves the window sitting under the pointer.
        let x = px + gap;
        if (x + frame.width > area.x + area.width)
            x = px - frame.width - gap;
        let y = py + gap;
        if (y + frame.height > area.y + area.height)
            y = py - frame.height - gap;

        // Clamp afterwards, for a window too big to fit on either side.
        x = Math.max(area.x, Math.min(x, area.x + area.width - frame.width));
        y = Math.max(area.y, Math.min(y, area.y + area.height - frame.height));

        window.move_frame(true, x, y);
        return true;
    }
}

export default class QmPlaceExtension extends Extension {
    enable() {
        this._service = new Service();
        this._dbus = Gio.DBusExportedObject.wrapJSObject(IFACE, this._service);
        this._dbus.export(Gio.DBus.session, PATH);
    }

    disable() {
        this._dbus?.unexport();
        this._dbus = null;
        this._service = null;
    }
}
