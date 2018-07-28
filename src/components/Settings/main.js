import { VTimePicker, VCheckbox, VSwitch, VAutocomplete, VMenu, VTextField } from 'vuetify';
import * as VRadioGroup from 'vuetify/es5/components/VRadioGroup';
import { loadLang } from '@/i18n';
import colors from 'vuetify/es5/util/colors';
import countries from './countries';
import artworks from './artworks';

// @vue/component
export default {
  name: 'Settings',
  components: {
    ...VRadioGroup,
    VTimePicker,
    VCheckbox,
    VSwitch,
    VAutocomplete,
    VMenu,
    VTextField,
  },
  data() {
    return {
      version: browser.runtime.getManifest().version,
      settings: {},
      palette: Object.keys(colors).map(f => colors[f].base).filter(f => f),
      country: countries,
      localLoading: false,
      backgroundLocal: {},
      menu: {
        from: false,
        to: false,
      },
    };
  },
  computed: {
    artworks() {
      const { locale } = this.$i18n;
      if (!locale) return [];
      return artworks.map(f => ({ text: this.$t(f.text), value: f.value }));
    },
    langs() {
      return Langs.map(f => ({ value: f.locale, text: f.name }));
    },
  },
  watch: {
    'settings.lang': function lang(val, old) {
      if (val === old || old === undefined) return;
      loadLang(val);
    },
    'settings.analytics': function analytics(val, old) {
      if (val === old || old === undefined) return;
      localStorage.setItem('analytics', JSON.stringify(val));
      if (val) this.$ga.enable();
      else this.$ga.disable();
    },
  },
  beforeDestroy() {
    this.$store.commit('SET_SETTINGS', this.settings);
    this.$store.commit('SET_BACKGROUND_LOCAL', this.backgroundLocal);
    if (!this.validateHex(this.settings.theme.primary)) {
      this.$store.commit('RESET_SETTING', 'theme');
    }
  },
  beforeMount() {
    this.settings = this.$store.state.settings;
    this.backgroundLocal = this.$store.state.cache.backgroundLocal;
    this.$set(this.settings, 'analytics', localStorage.getItem('analytics') !== 'false');
  },
  methods: {
    fileChange(event) {
      if (!event.target.files || !event.target.files.length) return;
      const reader = new FileReader();
      reader.readAsDataURL(event.target.files[0]);
      this.localLoading = true;
      reader.onload = (e) => {
        const { value } = event.target;
        this.backgroundLocal.filename = value
          .substring(value.lastIndexOf(value.indexOf('/') > -1 ? '/' : '\\') + 1);
        this.backgroundLocal.dataUrl = e.target.result;
        this.localLoading = false;
      };
    },
    deleteBackgroundLocal() {
      this.$store.commit('DEL_BACKGROUND_LOCAL');
      this.backgroundLocal = this.$store.state.cache.backgroundLocal;
    },
    validateHex(hex) {
      return hex && hex[0] === '#' && hex.length === 7;
    },
    themeChange(val) {
      this.settings.theme.primary = val;
      if (!this.validateHex(val)) return;
      const hex = parseInt(val.slice(1), 16);
      let r = (hex >> 16) & 255;
      let g = (hex >> 8) & 255;
      let b = hex & 255;
      const p = 20;
      r = r > p ? r - p : 0;
      g = g > p ? g - p : 0;
      b = b > p ? b - p : 0;
      this.settings.theme.light = (r + g + b) / 3 >= 128;
      this.settings.theme.secondary = `#${[r, g, b].map((x) => {
        const tmp = x.toString(16);
        return tmp.length === 1 ? `0${tmp}` : tmp;
      }).join('')}`;
    },
    reset() {
      this.$store.commit('RESET_SETTINGS');
    },
  },
};
