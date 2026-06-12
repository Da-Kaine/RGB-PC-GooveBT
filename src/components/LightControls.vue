<template>
  <!-- create bootstrap card with -->
  <div class="card">
    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-4">
        <h5 class="card-title mb-0">
          Controls: <span class="text-primary">{{ strip.device.name }}</span>
        </h5>

        <div>
          <button v-if="!isOn" @click="turnOn" class="btn btn-primary shadow-sm">
            Turn On
          </button>
          <button v-if="isOn" @click="turnOff" class="btn btn-danger shadow-sm">
            Turn Off
          </button>
        </div>
      </div>

      <div class="row mb-4">
        <div class="col-md-6">
          <div class="form-group mb-3">
            <label class="form-label fw-bold">Color</label>
            <div>
              <input type="input" class="color-picker" value="#FF0000" name="color" />
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group mb-3">
            <label class="form-label fw-bold">Brightness: {{ brightness }}%</label>
            <vue-slider @change="brightnessChange" v-model="brightness" :tooltip="'always'" />
          </div>
        </div>
      </div>

      <div class="mb-4">
        <label class="form-label fw-bold d-block">Music Modes</label>
        <div class="btn-group flex-wrap" role="group" aria-label="Music Modes">
          <button
            v-for="(music, index) in musicColors"
            :key="index"
            @click="setMusic(music)"
            type="button"
            class="btn btn-outline-secondary text-capitalize"
          >
            {{ music }}
          </button>
        </div>
      </div>

      <div class="mb-4">
        <label class="form-label fw-bold d-block">Scenes</label>
        <div class="btn-group flex-wrap" role="group" aria-label="Scenes">
          <button
            v-for="(scene, index) in scenes"
            :key="index"
            @click="setScene(scene)"
            type="button"
            class="btn btn-outline-secondary text-capitalize"
          >
            {{ scene }}
          </button>
        </div>
      </div>
      <!-- custom commands -->

      <div class="row">
        <div class="col-4">
          <small>
            Send Custom Commands eg:
            <b> 3301000000000000000000000000000000000032 </b>(Turn Off)
          </small>
        </div>
        <div class="col-auto">
          <label for="inputPassword2" class="visually-hidden"
            >Custom Commad</label
          >
          <input
            type="text"
            v-model="customCommand"
            class="form-control"
            id="inputPassword2"
            placeholder="Hex Code Command"
          />
        </div>
        <div class="col-auto">
          <button @click="sendCustomCommand" class="btn btn-primary mb-3">
            Send Command
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import VueSlider from "vue-slider-component";
import { createPicker } from "../models/Picker.js";
export default {
  props: {
    strip: {
      type: Object,
      required: true,
    },
  },
  components: {
    VueSlider,
  },
  data: () => {
    return {
      isOn: false,
      brightness: 100,
      musicColors: ["energetic", "spectrum", "rythm", "separation", "rolling"],
      customCommand: "",
      scenes: [
        "sunrise",
        "sunset",
        "movie",
        "dating",
        "romantic",
        "blinking",
        "candlelight",
        "snowflake",
        "rainbow",
      ],
      picker: null,
    };
  },
  methods: {
    async turnOn() {
      this.isOn = true;
      await this.strip.turnOn();
    },
    async turnOff() {
      this.isOn = false;
      await this.strip.turnOff();
    },
    setScene(scene) {
      this.strip.setScene(scene);
    },
    setMusic(scene) {
      this.strip.setScene(scene);
    },
    brightnessChange(value) {
      console.log("value", value);
      this.strip.setBrightness(value);
    },
    onChangeHandler(color) {
      let hexColor = color.toHEXA().toString();
      this.strip.setColor(hexColor);
      this.picker.setColor(hexColor);
    },
    sendCustomCommand() {
      this.strip.runStringCommand(this.customCommand);
    },
  },
  mounted() {
    this.picker = createPicker(this.onChangeHandler);
  },
};
</script>

<style>
.pcr-button {
  box-shadow: 1px 1px 4px 1px #4b4b4b;
}
.pickr {
  display: inline;
}
</style>