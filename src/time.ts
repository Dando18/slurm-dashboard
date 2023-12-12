/**
   Time utilities
*/

export class WallTime {
    constructor(public hours: number, public minutes: number, public seconds: number) {
        if (hours < 0 || minutes < 0 || seconds < 0) {
            throw new Error("Invalid time");
        }
        this.normalize();
    }

    normalize() {
        if (this.seconds >= 60) {
            this.minutes += Math.floor(this.seconds / 60);
            this.seconds = this.seconds % 60;
        }
        if (this.minutes >= 60) {
            this.hours += Math.floor(this.minutes / 60);
            this.minutes = this.minutes % 60;
        }
    }

    public static fromString(time: string): WallTime {
        let split = time.split(":").reverse();
        if (split.length > 3 || split.length === 0) {
            throw new Error("Invalid time string " + time);
        }

        let seconds: number = parseInt(split[0]);
        let minutes: number = split.length > 1 ? parseInt(split[1]) : 0;
        let hours: number = split.length > 2 ? parseInt(split[2]) : 0;
        return new WallTime(hours, minutes, seconds);
    }

    pad(n: number): string {
        return n < 10 ? "0" + n : "" + n;
    }

    public toString(): string {
        if (this.hours === 0 && this.minutes === 0) {
            return `${this.pad(this.seconds)}`;
        } else if (this.hours === 0) {
            return `${this.pad(this.minutes)}:${this.pad(this.seconds)}`;
        } else {
            return `${this.hours}:${this.pad(this.minutes)}:${this.pad(this.seconds)}`;
        }
    }

    public toSeconds(): number {
        return this.seconds + this.minutes * 60 + this.hours * 3600;
    }

    public absDiffSeconds(other: WallTime): number {
        return Math.abs(this.toSeconds() - other.toSeconds());
    }
}