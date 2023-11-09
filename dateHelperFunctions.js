export const MAX_EVENT_SUMMARY_LENGTH = 35;

export function trimLongEventName(summary) {
    if (summary.length > MAX_EVENT_SUMMARY_LENGTH) {
        return summary.substring(0, MAX_EVENT_SUMMARY_LENGTH) + "...";
    }
    else {
        return summary;
    }
}

export function getTodaysEvents(calendarSource) {

    const src = calendarSource;
    src._loadEvents(true);

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Get event from today at midnight

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let todaysEvents = src.getEvents(today, tomorrow);

    todaysEvents = todaysEvents.filter(event => {
        const start = event.date;
        const end = event.end;
        return !(start.getHours() === 0 && start.getMinutes() === 0 &&
                 end.getHours() === 0 && end.getMinutes() === 0);
    });

    return todaysEvents;
}

export function getNextEventsToDisplay(todaysEvents) {
    const now = new Date();
    const fiveMinutesLater = new Date(now.getTime() + 5 * 60000);
    const N = todaysEvents.length;

    let currentEvent = null; // The calendar event the user is currently in
    let nextEvent = null; // The next calendar event coming up
    let done = false;

    for (let i = 0; i < N; i++) {
        if (done) break;

        const event = todaysEvents[i];
        const eventStart = event.date;
        const eventEnd = event.end;

        if (now < eventStart) {

            nextEvent = event;
            break;
        }
        else if (now < eventEnd) {

            currentEvent = event;

            // Check whether there's an event after this one
            if (i < N - 1) {

                let someNextEvent;

                for (let j = i + 1; j < N; j++) {

                    someNextEvent = todaysEvents[j];

                    // Check whether the next event overlaps the current event
                    // or whether they start at the same time

                    if (!(someNextEvent.date.valueOf() === currentEvent.date.valueOf())) {
                        nextEvent = someNextEvent;
                        done = true;
                        break;
                    }
                }

            }
        }
    }

    if (nextEvent && nextEvent.date <= fiveMinutesLater) {
        return {
            currentEvent: currentEvent,
            nextEvent: nextEvent
        };
    } else {
        return {
            currentEvent: currentEvent,
            nextEvent: null
        };
    }
}

export function eventStatusToIndicatorText(eventStatus) {

    function displayNextEvent(event) {
        const timeText = getTimeOfEventAsText(event.date);
        const diffText = getTimeToEventAsText(event.date);

        const summary = trimLongEventName(event.summary);

        return `${summary} dans ${diffText}`;
    }

    function displayCurrentEventAndNextEvent(currentEvent, nextEvent) {
        const endsInText = getTimeToEventAsText(currentEvent.end);
        const timeText = getTimeOfEventAsText(nextEvent.date);

        const summary = trimLongEventName(nextEvent.summary);

        return `${event.summary} (${endsInText})`;
    }

    function displayCurrentEvent(event) {
        const endsInText = getTimeToEventAsText(event.end);

        return `${event.summary}`;
    }

    const { currentEvent, nextEvent } = eventStatus;

    if (currentEvent != null) {
        if (nextEvent != null) {
            return displayNextEvent(nextEvent);
        }
        else {
            return displayCurrentEvent(currentEvent);
        }
    }
    else {
        if (nextEvent != null) {
            return displayNextEvent(nextEvent);
        }
        else {
            return false;
        }
    }
}

export function getTimeOfEventAsText(eventDate) {
    const hrs = eventDate.getHours();
    let mins = eventDate.getMinutes().toString();

    mins = mins.padEnd(2, "0"); // Show e.g. 11am as 11:00 instead of 11:0

    const time = `${hrs}:${mins}`;
    return time;
}

export function getTimeToEventAsText(eventDate) {
    const now = new Date();
    const diff = Math.abs(eventDate - now);
    const diffInMins = Math.ceil(diff / (1000 * 60));

    const hrDiff = Math.floor(diffInMins / 60);
    const minDiff = diffInMins % 60;

    return hrDiff > 0 ? `${hrDiff}h${minDiff}` : `${minDiff} min`;
}
