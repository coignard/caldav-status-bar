/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

/* exported init */

import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';

import * as Calendar from 'resource:///org/gnome/shell/ui/calendar.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as DateHelperFunctions from './dateHelperFunctions.js';

const Indicator = GObject.registerClass(
    class Indicator extends PanelMenu.Button {
        _init() {
            super._init(0.0, 'CalDAV Status Bar Indicator');

            this._calendarSource = new Calendar.DBusEventSource();

            this._loadGUI();
            this._initialiseMenu();
        }

        _loadGUI() {
            this._menuLayout = new St.BoxLayout({
                vertical: false,
                clip_to_allocation: true,
                x_align: Clutter.ActorAlign.START,
                y_align: Clutter.ActorAlign.CENTER,
                reactive: true,
                x_expand: true,
                pack_start: false
            });

            this._calendarIcon = new St.Icon({
                icon_name: 'x-office-calendar-symbolic',
                style_class: 'system-status-icon',
                visible: false
            });

            this.text = new St.Label({ text: "", y_expand: true, y_align: Clutter.ActorAlign.CENTER });

            this._menuLayout.add_actor(this.text);
            this.add_actor(this._menuLayout);
        }

        _initialiseMenu() {
            const settingsItem = new PopupMenu.PopupMenuItem(_('Settings'));
            settingsItem.connect('activate', () => {
                ExtensionUtils.openPrefs();
            });
            this.menu.addMenuItem(settingsItem);
        }

        setText(text) {
            this.text.set_text(text);
        }

        updateCalendarIconVisibility(showIcon) {
            if (showIcon && !this._calendarIcon.get_parent()) {
                this._menuLayout.insert_child_at_index(this._calendarIcon, 0);
                this._calendarIcon.visible = true;
            } else if (!showIcon && this._calendarIcon.get_parent()) {
                this._menuLayout.remove_actor(this._calendarIcon);
                this._calendarIcon.visible = false;
            }
        }

        showCalendarIcon() {
            this.icon.set_icon_name("x-office-calendar-symbolic");
        }

        showIndicator() {
            this._menuLayout.show();
        }

        hideIndicator() {
            this._menuLayout.hide();
        }

        vfunc_event(event) {

            if ((event.type() == Clutter.EventType.TOUCH_END || event.type() == Clutter.EventType.BUTTON_RELEASE)) {

                if (event.get_button() === Clutter.BUTTON_PRIMARY) {

                    // Show calendar on left click
                    if (this.menu.isOpen) {
                        this.menu._getTopMenu().close();
                    }
                    else {
                        Main.panel.toggleCalendar();
                    }

                }
                else {
                    // Show settings menu on right click
                    this.menu.toggle();
                }
            }

            return Clutter.EVENT_PROPAGATE;
        }

        containsEmoji(text) {
            const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
            return emojiRegex.test(text);
        }
    });

class Extension {
    constructor(uuid) {
        this._uuid = uuid;
    }

    enable() {
        this._indicator = new Indicator();
        this._startLoop();
    }

    _startLoop() {
        this.sourceId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            5,                               // seconds to wait
            () => {
                this.refreshIndicator();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    loadIndicator() {
        if (!this._indicator.container.get_parent()) {
            Main.panel._centerBox.insert_child_at_index(this._indicator.container, 1);
        }
    }

    unloadIndicator() {
        if (this._indicator.container.get_parent()) {
            this._indicator.container.get_parent().remove_child(this._indicator.container);
        }
    }

    refreshIndicator() {
        const todaysEvents = DateHelperFunctions.getTodaysEvents(this._indicator._calendarSource);
        const eventStatus = DateHelperFunctions.getNextEventsToDisplay(todaysEvents);
        const text = DateHelperFunctions.eventStatusToIndicatorText(eventStatus);

        if (text === "") {
            this.unloadIndicator();
            this._indicator.hideIndicator();
            return;
        }

        if (eventStatus.currentEvent === null && eventStatus.nextEvent === null) {
            this.unloadIndicator();
            this._indicator.hideIndicator();
        } else {
            this.loadIndicator();
            this._indicator.showIndicator();
            this._indicator.setText(text);

            const showIcon = !this._indicator.containsEmoji(eventStatus.currentEvent?.summary || "") &&
                             !this._indicator.containsEmoji(eventStatus.nextEvent?.summary || "");
            this._indicator.updateCalendarIconVisibility(showIcon);
        }
    }

    disable() {
        this.unloadIndicator();
        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }

        if (this.sourceId) {
            GLib.Source.remove(this.sourceId);
            this.sourceId = null;
        }
    }
}

export default function init(meta) {
    return new Extension(meta.uuid);
}
