const API = 'https://api.openweathermap.org/data/2.5/';

const imgs = {
  day: [
    200, 201, 300, 500, 501, 502, 503, 511,
    600, 601, 602, 700, 800, 801, 803, 804, 952, 953,
  ],
  night: [200, 500, 501, 502, 503, 600, 800, 801],
};

// @vue/component
export default {
  name: 'Weather',
  props: {
    settings: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      today: null,
      forecast: null,
      geoError: null,
    };
  },
  computed: {
    sunrise() {
      return new Date(this.today.sys.sunrise * 1000)
        .toLocaleTimeString(this.$i18n.locale, this.timeOption);
    },
    sunset() {
      return new Date(this.today.sys.sunset * 1000)
        .toLocaleTimeString(this.$i18n.locale, this.timeOption);
    },
    timeOption() {
      return { hour: '2-digit', minute: '2-digit' };
    },
  },
  mounted() {
    this.$emit('update:cardtitle', new Date().toLocaleDateString(this.$i18n.locale, {
      weekday: 'long',
    }));
    if (this.VALID_CACHE && this.today && !this.geoError) return this.$emit('init', false);
    return this.getLocalisation()
      .then(this.getQuery)
      .then(query => Promise.all([this.getToday(query), this.getForecast(query)]))
      .then(() => this.$emit('init', true))
      .catch(err => this.$emit('init', err));
  },
  methods: {
    getImg(nb, night = true) {
      const path = '/imgs/weather/weather-';
      const date = Date.now() / 1000;
      if (night && !(date > this.today.sys.sunrise && date < this.today.sys.sunset)) {
        const closest = imgs.night.reduce((a, b) => (Math.abs(b - nb) < Math.abs(a - nb) ? b : a));
        if (imgs.night.includes(nb)) {
          return `${path}${nb}-n.png`;
        }
        if (`${closest}`[0] === `${nb}`[0]) {
          return `${path}${closest}-n.png`;
        }
      }
      const closest = imgs.day.reduce((a, b) => (Math.abs(b - nb) < Math.abs(a - nb) ? b : a));
      if (imgs.day.includes(nb)) {
        return `${path}${nb}.png`;
      }
      if (`${closest}`[0] === `${nb}`[0]) {
        return `${path}${closest}.png`;
      }
      return `${path}none.png`;
    },
    fetch(mode, query) {
      let endpoint = `${API}${mode}?${query}&appid=${this.settings.appId}&lang=${this.$i18n.locale}`;
      if (this.settings.units !== 'kelvin') {
        endpoint += `&units=${this.settings.units}`;
      }
      return this.$http.get(endpoint);
    },
    getToday(query) {
      return this.fetch('weather', query)
        .then((res) => {
          this.today = res.data;
          this.today.wind.speed = this.today.wind.speed * 3.6 | 0;
          this.today.main.temp |= 0;
          if (this.today.weather[0] && this.today.weather[0].description) {
            this.today.weather[0].description = this.today.weather[0].description
              .split(' ').map(w => w[0].toUpperCase() + w.substr(1)).join(' ');
          }
        });
    },
    getForecast(query) {
      if (!this.settings.forecast) return Promise.resolve();
      return this.fetch('forecast', query)
        .then((res) => {
          this.forecast = res.data.list.map((f) => {
            f.main.temp |= 0;
            if (f.weather[0] && f.weather[0].description) {
              f.weather[0].description = f.weather[0].description.split(' ').map(w => w[0].toUpperCase() + w.substr(1)).join(' ');
            }
            if (this.settings.units === 'metric') f.title = `${f.main.temp}°C ${f.weather[0].description}`;
            if (this.settings.units === 'imperial') f.title = `${f.main.temp}°F ${f.weather[0].description}`;
            if (this.settings.units === 'kelvin') f.title = `${f.main.temp}K ${f.weather[0].description}`;
            return f;
          }).filter((f) => {
            const date = new Date(f.dt_txt);
            return date.getDate() !== new Date().getDate() && date.getHours() === 12;
          });
        });
    },
    getQuery(pos) {
      if (pos.coords) {
        const { latitude, longitude } = pos.coords;
        return `lat=${latitude}&lon=${longitude}`;
      }
      if (pos.city) return `q=${pos.city}`;
      throw new Error('Enter valid city name');
    },
    getLocalisation() {
      this.geoError = null;
      if (!this.settings.auto) return Promise.resolve({ city: this.settings.city });
      if (!navigator.geolocation) {
        if (!this.today) this.$emit('update:subtitle', 'Geolocation error');
        const error = 'Geolocation is not supported please enter city name in card settings.';
        this.geoError = error;
        return Promise.reject(new Error(error));
      }
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, (err) => {
          if (!this.today) this.$emit('update:subtitle', 'Geolocation error');
          this.geoError = 'Try later or enter a city manually in card settings.';
          reject(new Error(err.message));
        }, {
          timeout: 30000,
          enableHighAccuracy: true,
          maximumAge: 75000,
        });
      });
    },
  },
};
