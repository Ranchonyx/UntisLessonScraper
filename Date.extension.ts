declare global {
    export interface Date {
        getWeek(dowOffset?: number): number;
    }
}

Date.prototype.getWeek = function (dowOffset?: number) {
    /*getWeek() was developed by Nick Baicoianu at MeanFreePath: http://www.epoch-calendar.com */

    dowOffset = typeof dowOffset == 'number' ? dowOffset : 0; //default dowOffset to zero
    var newYear = new Date(this.getFullYear(), 0, 1);
    var day = newYear.getDay() - dowOffset; //the day of week the year begins on
    day = day >= 0 ? day : day + 7;
    var daynum =
        Math.floor(
            (this.getTime() -
                newYear.getTime() -
                (this.getTimezoneOffset() - newYear.getTimezoneOffset()) * 60000) /
            86400000
        ) + 1;
    var weeknum;
    //if the year starts before the middle of a week
    if (day < 4) {
        weeknum = Math.floor((daynum + day - 1) / 7) + 1;
        if (weeknum > 52) {
            let nYear = new Date(this.getFullYear() + 1, 0, 1);
            let nday = nYear.getDay() - dowOffset;
            nday = nday >= 0 ? nday : nday + 7;
            /*if the next year starts before the middle of
                 the week, it is week #1 of that year*/
            weeknum = nday < 4 ? 1 : 53;
        }
    } else {
        weeknum = Math.floor((daynum + day - 1) / 7);
    }
    return weeknum;
};

export class DateRangeIterator {
    start_dt: Date;
    end_dt: Date;

    constructor(d1: Date | number, d2: Date | number) {
        this.start_dt = new Date(d1);
        this.end_dt = new Date(d2);
    }

    *[Symbol.iterator]() {
        let loop = this.start_dt;
        while (loop <= this.end_dt) {
            yield loop;
            let newDate = loop.setDate(loop.getDate() + 1);
            loop = new Date(newDate);
        }
    }
}

export class CalendarWeekIterator {
    start_dt: Date;
    weekOffset: number;
    constructor(start_dt: Date | number, weekOffset: number) {
        this.start_dt = new Date(start_dt);
        this.weekOffset = weekOffset;
    }

    *[Symbol.iterator]() {
        let loop = new Date(this.start_dt);
        while (loop.getWeek() <= this.start_dt.getWeek() + this.weekOffset) {
            yield loop;
            let newDate = loop.setDate(loop.getDate() + 1);
            loop = new Date(newDate);
        }
        yield loop;
    }
}
