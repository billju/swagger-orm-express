class Moment extends Date {
    static pad = (num = 2020, maxLength = 4) => num.toString().padStart(maxLength, '0');
    static to12H = (hour = 0) => (hour % 12 == 0 ? 12 : hour % 12);
    static MONTHS = '一,二,三,四,五,六,七,八,九,十,十一,十二'.split(',');
    static WEEKDAYS = '日,一,二,三,四,五,六'.split(',');
    static CONFIG = [
        { key: 'tYY', remark: '年(109)', stringify: (date) => Moment.pad(date.getFullYear() - 1911, 3), re: /\d{1,4}/, parse: (d, n) => d.setFullYear(n * 1 + 1911) },
        { key: 'tY', remark: '年(09)', stringify: (date) => Moment.pad(date.getFullYear() - 1911, 2), re: /\d{1,2}/, parse: (d, n) => d.setFullYear(n * 1 + 2011) },
        { key: 'YYYY', remark: '年(2020)', stringify: (date) => Moment.pad(date.getFullYear(), 4), re: /\d{4}/, parse: (d, n) => d.setFullYear(n * 1) },
        { key: 'YY', remark: '年(20)', stringify: (date) => Moment.pad(date.getFullYear(), 2), re: /\d{2}/, parse: (d, n) => d.setFullYear(n * 1 + 2000) },
        { key: 'tM', remark: '月(一)', stringify: (date) => Moment.MONTHS[date.getMonth()], re: /一|二|三|四|五|六|七|八|九|十|十一|十二/, parse: (d, n) => d.setMonth(Moment.MONTHS.indexOf(n)) },
        { key: 'MM', remark: '月(01)', stringify: (date) => Moment.pad(date.getMonth() + 1, 2), re: /\d{2}/, parse: (d, n) => d.setMonth(n * 1 - 1) },
        { key: 'M', remark: '月(1)', stringify: (date) => date.getMonth() + 1, re: /\d{1,2}/, parse: (d, n) => d.setMonth(n * 1 - 1) },
        { key: 'DD', remark: '日(01~31)', stringify: (date) => Moment.pad(date.getDate(), 2), re: /\d{2}/, parse: (d, n) => d.setDate(n * 1) },
        { key: 'D', remark: '日(1~31)', stringify: (date) => date.getDate(), re: /\d{1,2}/, parse: (d, n) => d.setDate(n * 1) },
        { key: 'HH', remark: '小時(00~23)', stringify: (date) => Moment.pad(date.getHours(), 2), re: /\d{2}/, parse: (d, n) => d.setHours(n * 1) },
        { key: 'H', remark: '小時(0~23)', stringify: (date) => date.getHours(), re: /\d{1,2}/, parse: (d, n) => d.setHours(n * 1) },
        { key: 'hh', remark: '小時(00~11)', stringify: (date) => Moment.pad(Moment.to12H(date.getHours()), 2), re: /\d{2}/, parse: (d, n) => (d.isAM ? d.setHours(n * 1) : n == '12' ? d.setHours(12) : d.setHours(n * 1 + 12)) },
        { key: 'h', remark: '小時(0~11)', stringify: (date) => Moment.to12H(date.getHours()), re: /\d{1,2}/, parse: (d, n) => (d.isAM ? d.setHours(n * 1) : n == '12' ? d.setHours(12) : d.setHours(n * 1 + 12)) },
        { key: 'tm整', remark: '分鐘(整~59分)', stringify: (date) => (date.getMinutes() == 0 ? '整' : date.getMinutes() + '分'), re: /\d{0,2}分?/, parse: (d, n) => d.setMinutes(n.replace(/整|分/, '') * 1 || 0) },
        { key: 'tm', remark: '分鐘(空字串~59分)', stringify: (date) => (date.getMinutes() == 0 ? '' : date.getMinutes() + '分'), re: /\d{0,2}分?/, parse: (d, n) => d.setMinutes(n.replace('分', '') * 1 || 0) },
        { key: 'mm', remark: '分鐘(00~59)', stringify: (date) => Moment.pad(date.getMinutes(), 2), re: /\d{2}/, parse: (d, n) => d.setMinutes(n * 1) },
        { key: 'm', remark: '分鐘(0~59)', stringify: (date) => date.getMinutes(), re: /\d{1,2}/, parse: (d, n) => d.setMinutes(n * 1) },
        { key: 'ss', remark: '秒(00~59)', stringify: (date) => Moment.pad(date.getSeconds(), 2), re: /\d{2}/, parse: (d, n) => d.setSeconds(n * 1) },
        { key: 's', remark: '秒(0~59)', stringify: (date) => date.getSeconds(), re: /\d{1,2}/, parse: (d, n) => d.setSeconds(n * 1) },
        { key: 'd', remark: '星期(日~六)', stringify: (date) => Moment.WEEKDAYS[date.getDay()], re: /日|一|二|三|四|五|六/, parse: (d, n) => null },
        { key: 'A', remark: '上中下午', stringify: (date) => (date.getHours() < 12 ? '上午' : date.getHours() == 12 ? '中午' : '下午'), re: /上午|中午|下午/, parse: (d, n) => (d.isAM = n.match(/上午/) || !n.match(/中午|下午/)) },
    ];
    static date2str(date, format = '中華民國tYY年M月D日 Ah時m分') {
        if (!(date instanceof Date) || date == 'Invalid Date') return '';
        for (let { key, stringify } of Moment.CONFIG) format = format.replace(key, stringify(date));
        return format;
    }
    static str2date(str = '中華民國111年5月20日（星期五）中午12時59分', format = '中華民國tYY年M月D日（星期d）Ah時m分') {
        // 辨識格式，抓取樣式及下一個字串的間距，例如「中華民國tYY年M月D日 Ah時m分」，輸出：
        // { skip: 4, config: tYY }
        // { skip: 1, config: M }
        // { skip: 1, config: D }
        // { skip: 2, config: A }
        // { skip: 0, config: h }
        // { skip: 1, config: m }
        const patterns = [];
        let skip = 0;
        while (format) {
            const config = Moment.CONFIG.find((x) => format.slice(0, x.key.length) == x.key);
            if (config) {
                patterns.push({ skip, config });
                format = format.slice(config.key.length);
                skip = 0;
            } else {
                format = format.slice(1);
                skip++;
            }
        }
        const date = new Date(0);
        for (let { skip, config } of patterns) {
            const matched = str.slice(skip).match(config.re);
            if (!matched) return undefined;
            config.parse(date, matched[0]);
            str = str.slice(skip + matched[0].length);
        }
        return date;
    }
    static YEARS = 365 * 24 * 60 * 60 * 1000;
    static MONTHS = 30 * 24 * 60 * 60 * 1000;
    static DAYS = 24 * 60 * 60 * 1000;
    static HOURS = 60 * 60 * 1000;
    static MINUTES = 60 * 1000;
    static SECONDS = 1000;
    add(num = 0, type = 'days') {
        this.setTime(this.getTime() + num * Moment[type.toUpperCase()]);
        return this;
    }
    subtract(num = 0, type = 'days') {
        this.setTime(this.getTime() - num * Moment[type.toUpperCase()]);
        return this;
    }
    diff(moment, type = 'days', float = false) {
        const diff = (this - moment) / Moment[type.toUpperCase()];
        if (float) return diff;
        else return Math.ceil(diff);
    }
    format = (format = '') => Moment.date2str(this, format);
    hour = (n) => (n === undefined ? this.getHours() : this.setHours(n) && this);
    minute = (n) => (n === undefined ? this.getMinutes() : this.setMinutes(n) && this);
    second = (n) => (n === undefined ? this.getSeconds() : this.setSeconds(n) && this);
    day = (n) => (n === undefined ? this.getDate() : this.setDate(n) && this);
    month = (n) => (n === undefined ? this.getMonth() + 1 : this.setMonth(n - 1) && this);
    year = (n) => (n === undefined ? this.getFullYear() : this.setFullYear(n) && this);
    /** 星期幾 */ weekday = () => this.getDay();
    /** 當月有幾天 */ date = () => new Date(this.getFullYear(), this.getMonth() + 1, 0).getDate();
    toDate = () => new Date(this);
}
module.exports = function moment(date = '', format = '') {
    if (format) return new Moment(Moment.str2date(date, format));
    else if (date) return new Moment(date);
    else return new Moment();
}