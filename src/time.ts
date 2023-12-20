/**
   Time utilities
*/


/**
 * Represents a wall time duration in days, hours, minutes, and seconds.
 */
export class WallTime {

    /**
     * Creates a new instance of WallTime.
     * @param days The number of days.
     * @param hours The number of hours.
     * @param minutes The number of minutes.
     * @param seconds The number of seconds.
     * @throws Error if any of the parameters are negative or not a number.
     */
    constructor(public days: number, public hours: number, public minutes: number, public seconds: number) {
        if (days < 0 || hours < 0 || minutes < 0 || seconds < 0 || isNaN(days) || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
            throw new Error("Invalid time");
        }
        this.normalize();
    }

    /**
     * Normalizes the wall time by adjusting the values of hours, minutes, and seconds.
     * For example, if seconds is greater than or equal to 60, it adjusts minutes and seconds accordingly.
     * If minutes is greater than or equal to 60, it adjusts hours and minutes accordingly.
     * If hours is greater than or equal to 24, it adjusts days and hours accordingly.
     */
    private normalize() {
        if (this.seconds >= 60) {
            this.minutes += Math.floor(this.seconds / 60);
            this.seconds = this.seconds % 60;
        }
        if (this.minutes >= 60) {
            this.hours += Math.floor(this.minutes / 60);
            this.minutes = this.minutes % 60;
        }
        if (this.hours >= 24) {
            this.days += Math.floor(this.hours / 24);
            this.hours = this.hours % 24;
        }
    }

    /**
     * Parses a time string in the format D-HH:MM:SS, HH:MM:SS, MM:SS, or SS and returns a WallTime object.
     * @param time The time string to parse.
     * @returns A WallTime object representing the parsed time.
     * @throws Error if the time string is invalid.
     */
    public static fromString(time: string): WallTime {
        let split = time.split(":");
        if (split.length > 3 || split.length === 0) {
            throw new Error("Invalid time string " + time);
        }

        const dashIndex: number = split[0].indexOf("-");
        if (split.length === 3 && dashIndex !== -1) {
            const daysStr: string = split[0].substring(0, dashIndex);
            const hoursStr: string = split[0].substring(dashIndex+1);

            if (isNaN(+daysStr) || isNaN(+hoursStr)) {
                throw new Error("Invalid numbers in time string " + time);
            }
            split = [daysStr, hoursStr, ...split.slice(1)];
        }

        if (split.some((s) => isNaN(+s))) {
            throw new Error("Invalid numbers in time string " + time);
        }

        split = split.reverse();
        let seconds: number = parseInt(split[0], 10);
        let minutes: number = split.length > 1 ? parseInt(split[1], 10) : 0;
        let hours: number = split.length > 2 ? parseInt(split[2], 10) : 0;
        let days: number = split.length > 3 ? parseInt(split[3], 10) : 0;
        return new WallTime(days, hours, minutes, seconds);
    }

    /**
     * Pads a number with a leading zero if it is less than 10.
     * @param n The number to pad.
     * @returns The padded number as a string.
     */
    private pad(n: number): string {
        return n < 10 ? "0" + n : "" + n;
    }

    /**
     * Returns a string representation of the wall time.
     * @returns The wall time as a string in the format D-HH:MM:SS, HH:MM:SS, MM:SS, or SS.
     */
    public toString(): string {
        if (this.days > 0) {
            return `${this.days}-${this.pad(this.hours)}:${this.pad(this.minutes)}:${this.pad(this.seconds)}`;
        } else if (this.hours > 0) {
            return `${this.hours}:${this.pad(this.minutes)}:${this.pad(this.seconds)}`;
        } else if (this.minutes > 0) {
            return `${this.pad(this.minutes)}:${this.pad(this.seconds)}`;
        } else {
            return `${this.pad(this.seconds)}`;
        }
    }

    /**
     * Returns the total number of seconds in the wall time.
     * @returns The total number of seconds.
     */
    public toSeconds(): number {
        return this.seconds + this.minutes * 60 + this.hours * 3600 + this.days * 86400;
    }

    /**
     * Adds another WallTime object to the current wall time and returns a new WallTime object.
     * @param other The WallTime object to add.
     * @returns A new WallTime object representing the sum of the two wall times.
     */
    public add(other: WallTime): WallTime {
        return new WallTime(this.days + other.days, this.hours + other.hours, this.minutes + other.minutes, this.seconds + other.seconds);
    }

    /**
     * Adds the specified number of seconds to the current wall time and returns a new WallTime object.
     * @param seconds The number of seconds to add.
     * @returns A new WallTime object representing the updated wall time.
     */
    public addSeconds(seconds: number): WallTime {
        return new WallTime(this.days, this.hours, this.minutes, this.seconds + seconds);
    }

    /**
     * Calculates the absolute difference in seconds between the current wall time and another WallTime object.
     * @param other The WallTime object to compare.
     * @returns The absolute difference in seconds.
     */
    public absDiffSeconds(other: WallTime): number {
        return Math.abs(this.toSeconds() - other.toSeconds());
    }

    /**
     * Compares the current wall time with another WallTime object.
     * @param other The WallTime object to compare.
     * @returns A negative number if the current wall time is less than the other wall time,
     *          a positive number if the current wall time is greater than the other wall time,
     *          or zero if the wall times are equal.
     */
    public cmp(other: WallTime): number {
        return this.toSeconds() - other.toSeconds();
    }
}