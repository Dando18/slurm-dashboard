/**
   Time utilities
*/

export class WallTime {
    constructor(public days: number, public hours: number, public minutes: number, public seconds: number) {
        if (days < 0 || hours < 0 || minutes < 0 || seconds < 0 || isNaN(days) || isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
            throw new Error("Invalid time");
        }
        this.normalize();
    }

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
     * Parse a time string in the format D-HH:MM:SS, HH:MM:SS, MM:SS, or SS
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

    private pad(n: number): string {
        return n < 10 ? "0" + n : "" + n;
    }

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

    public toSeconds(): number {
        return this.seconds + this.minutes * 60 + this.hours * 3600 + this.days * 86400;
    }

    public add(other: WallTime): WallTime {
        return new WallTime(this.days + other.days, this.hours + other.hours, this.minutes + other.minutes, this.seconds + other.seconds);
    }

    public addSeconds(seconds: number): WallTime {
        return new WallTime(this.days, this.hours, this.minutes, this.seconds + seconds);
    }

    public absDiffSeconds(other: WallTime): number {
        return Math.abs(this.toSeconds() - other.toSeconds());
    }

    public cmp(other: WallTime): number {
        return this.toSeconds() - other.toSeconds();
    }
}