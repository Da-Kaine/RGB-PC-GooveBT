<template>
  <div class="container mt-4">
    <h1 class="text-center rainbow rainbow_text_animated">RGB-PC</h1>

    <div class="card mb-4 shadow-sm border-0 bg-light">
      <div class="card-body">
        <div class="help">
          <p class="mb-2">
            This software has been tested on H619E, your mileage may vary. This is not the official control software and is in no way associated with Govee. This software is provided as is with no guarantees and using it may void your warranty; please proceed with caution.
          </p>
          <ul class="text-muted small">
            <li>This software requires Bluetooth connectivity and your PC should be in close range with the strip controller.</li>
            <li>Click scan to connect to your LED strip.</li>
            <li>Note that the LED strip controller can only connect to one device via Bluetooth. You may have to turn off Bluetooth on your phone so as to disconnect your phone from the LED controller and make the controller discoverable on PC.</li>
          </ul>
          <button @click="openHelp" class="btn btn-sm btn-outline-secondary float-end">Documentation</button>
        </div>
      </div>
    </div>

    <div class="d-flex justify-content-between align-items-center mb-3">
      <h2 class="h4 mb-0 fw-bold">Devices</h2>
      <button @click="scan" class="btn btn-primary px-4 shadow-sm rounded-pill" :disabled="scanning">
        <span v-if="scanning" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        {{ scanning ? 'Scanning...' : 'SCAN FOR DEVICES' }}
      </button>
    </div>

    <div class="list-group shadow-sm mb-4">
      <!-- Pinned / Last Connected / Favorites -->
      <div v-for="device in sortedDevices.pinned" :key="device.deviceId" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center border-primary border-start border-4" :class="{'opacity-75 bg-light': device.isOffline}">
        <div>
          <div class="d-flex align-items-center">
            <span class="badge bg-primary me-2">{{ device.isLastConnected ? 'Last Connected' : 'Favorite' }}</span>
            <span v-if="device.isOffline" class="badge bg-secondary me-2">Offline</span>
            <h5 class="mb-1">
              <input v-if="editingId === device.deviceId" v-model="tempCustomName" @blur="saveName(device)" @keyup.enter="saveName(device)" class="form-control form-control-sm d-inline-block w-auto" autofocus />
              <span v-else @click="editName(device)" class="cursor-pointer" title="Click to rename">{{ device.customName || device.deviceName }}</span>
            </h5>
          </div>
          <small class="text-muted">{{ device.deviceId }}</small>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-warning me-2" @click="toggleFavorite(device)">
            {{ isFavorite(device) ? '★' : '☆' }}
          </button>
          <button v-if="device.isOffline" class="btn btn-outline-primary" @click="scan">
            Scan to Connect
          </button>
          <button v-else class="btn btn-primary" :disabled="connected" @click="connect(device)">
            {{ connected && state.device?.deviceId === device.deviceId ? 'Connected' : 'Connect' }}
          </button>
        </div>
      </div>

      <!-- Other Supported Devices -->
      <div v-for="device in sortedDevices.supported" :key="device.deviceId" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
        <div>
          <h5 class="mb-1">
            <input v-if="editingId === device.deviceId" v-model="tempCustomName" @blur="saveName(device)" @keyup.enter="saveName(device)" class="form-control form-control-sm d-inline-block w-auto" autofocus />
            <span v-else @click="editName(device)" class="cursor-pointer" title="Click to rename">{{ device.customName || device.deviceName }}</span>
          </h5>
          <small class="text-muted">{{ device.deviceId }}</small>
        </div>
        <div>
          <button class="btn btn-sm btn-outline-warning me-2" @click="toggleFavorite(device)">
            {{ isFavorite(device) ? '★' : '☆' }}
          </button>
          <button class="btn btn-primary" :disabled="connected" @click="connect(device)">
            Connect
          </button>
        </div>
      </div>
    </div>

    <!-- Unknown Devices Dropdown -->
    <div v-if="sortedDevices.unknown.length" class="accordion mb-4" id="unknownDevicesAccordion">
      <div class="accordion-item">
        <h2 class="accordion-header" id="headingUnknown">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseUnknown" aria-expanded="false" aria-controls="collapseUnknown">
            Unknown or Unsupported Devices ({{ sortedDevices.unknown.length }})
          </button>
        </h2>
        <div id="collapseUnknown" class="accordion-collapse collapse" aria-labelledby="headingUnknown" data-bs-parent="#unknownDevicesAccordion">
          <div class="accordion-body p-0">
            <div class="list-group list-group-flush">
              <div v-for="device in sortedDevices.unknown" :key="device.deviceId" class="list-group-item d-flex justify-content-between align-items-center bg-light">
                <div>
                  <h6 class="mb-0 text-muted">{{ device.deviceName || 'Unnamed Device' }}</h6>
                  <small class="text-muted" style="font-size: 0.75rem;">{{ device.deviceId }}</small>
                </div>
                <button class="btn btn-sm btn-outline-secondary" :disabled="connected" @click="connect(device)">
                  Connect Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <LightControls v-if="strip" :strip="strip"></LightControls>
    <LightSync v-if="strip" :strip="strip"></LightSync>
  </div>
</template>

<script>
import LightControls from "./components/LightControls.vue";
import LightSync from "./components/LightSync.vue";
import Strip from "./models/Strip";
import state from "./state";

//import ipcrender
const ipcRenderer = require("electron").ipcRenderer;
const shell = require("electron").shell;
window.ipcRenderer = ipcRenderer;

export default {
  name: "App",
  components: {
    LightControls,
    LightSync,
  },
  data: () => {
    return {
      devices: [],
      isOn: false,
      chooseDeviceCallback: null,
      strip: null,
      connected: false,
      scanning: false,
      favorites: JSON.parse(localStorage.getItem("favorites") || "{}"),
      lastConnectedId: localStorage.getItem("lastConnectedId"),
      editingId: null,
      tempCustomName: "",
      state,
    };
  },
  computed: {
    sortedDevices() {
      const pinned = [];
      const supported = [];
      const unknown = [];

      const allDevices = [...this.devices];

      // Add last connected device if not present in scan results
      if (this.lastConnectedId && !allDevices.find(d => d.deviceId === this.lastConnectedId)) {
        const lastDeviceName = localStorage.getItem("lastConnectedName");
        if (lastDeviceName) {
          allDevices.push({
            deviceId: this.lastConnectedId,
            deviceName: lastDeviceName,
            isOffline: true
          });
        }
      }

      // Add favorites that are not in the scan and not the last connected
      Object.keys(this.favorites).forEach(favId => {
        if (!allDevices.find(d => d.deviceId === favId)) {
          allDevices.push({
            deviceId: favId,
            deviceName: this.favorites[favId].name,
            isOffline: true
          });
        }
      });

      allDevices.forEach(device => {
        const enhancedDevice = {
          ...device,
          customName: this.favorites[device.deviceId]?.name || "",
          isFavorite: !!this.favorites[device.deviceId],
          isLastConnected: device.deviceId === this.lastConnectedId,
          editing: false
        };

        const isGovee = device.deviceName?.toLowerCase().includes("govee") || device.deviceName?.toLowerCase().includes("h619");

        if (enhancedDevice.isLastConnected || enhancedDevice.isFavorite) {
          pinned.push(enhancedDevice);
        } else if (isGovee) {
          supported.push(enhancedDevice);
        } else {
          unknown.push(enhancedDevice);
        }
      });

      return { pinned, supported, unknown };
    }
  },
  methods: {
    openHelp() {
      shell.openExternal("https://github.com/ib0b/RGB-PC");
    },
    async connect(device) {
      if (this.connected) return;
      state.device = device;
      this.connected = true;
      this.lastConnectedId = device.deviceId;
      localStorage.setItem("lastConnectedId", device.deviceId);
      localStorage.setItem("lastConnectedName", device.deviceName);
      ipcRenderer.send("deviceSelected", device.deviceId);
    },
    async scan() {
      this.scanning = true;
      try {
        let device = await navigator.bluetooth.requestDevice({
          optionalServices: [
            "f000ffc0-0451-4000-b000-000000000000",
            "00010203-0405-0607-0809-0a0b0c0d1910",
            "00001800-0000-1000-8000-00805f9b34fb",
          ],
          acceptAllDevices: true,
        });

        let strip = new Strip(device);
        window.strip = strip;
        this.strip = strip;
      } catch (e) {
        console.error("Scan failed", e);
      } finally {
        this.scanning = false;
      }
    },
    toggleFavorite(device) {
      if (this.favorites[device.deviceId]) {
        delete this.favorites[device.deviceId];
      } else {
        this.favorites[device.deviceId] = { name: device.customName || device.deviceName };
      }
      this.saveFavorites();
    },
    isFavorite(device) {
      return !!this.favorites[device.deviceId];
    },
    editName(device) {
      this.editingId = device.deviceId;
      this.tempCustomName = device.customName || device.deviceName;
    },
    saveName(device) {
      if (this.editingId === device.deviceId) {
        if (this.tempCustomName && this.tempCustomName !== (device.customName || device.deviceName)) {
          if (!this.favorites[device.deviceId]) {
            this.favorites[device.deviceId] = {};
          }
          this.favorites[device.deviceId].name = this.tempCustomName;
          this.saveFavorites();
        }
        this.editingId = null;
      }
    },
    saveFavorites() {
      localStorage.setItem("favorites", JSON.stringify(this.favorites));
    }
  },
  async mounted() {
    ipcRenderer.on("deviceList", (event, devices) => {
      this.devices = devices;
    });

    // Check if we can pre-populate with last connected if it exists in local storage
    const lastDeviceName = localStorage.getItem("lastConnectedName");
    if (this.lastConnectedId && lastDeviceName && this.devices.length === 0) {
       // We don't have the full device object from Electron's bluetooth picker yet
       // so we can't really "pin" it before scan unless we mock it or store enough info.
    }
  },
};
</script>

<style>
body {
  background-color: #f8f9fa;
  font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

.color-box {
  display: inline-block;
  height: 30px;
  width: 30px;
}

.cursor-pointer {
  cursor: pointer;
}

.rainbow {
  text-align: center;
}
.rainbow_text_animated {
  background: linear-gradient(
    to right,
    #6666ff,
    #0099ff,
    #00ff00,
    #ff3399,
    #6666ff
  );
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: rainbow_animation 3s ease-in-out infinite;
  background-size: 400% 100%;
}

@keyframes rainbow_animation {
  0%,
  100% {
    background-position: 0 0;
  }

  50% {
    background-position: 100% 0;
  }
}

.list-group-item {
  transition: all 0.2s ease;
}

.list-group-item:hover {
  background-color: #f1f3f5;
}

.btn-primary {
  background-color: #6610f2;
  border-color: #6610f2;
}

.btn-primary:hover {
  background-color: #520dc2;
  border-color: #520dc2;
}

.accordion-button:not(.collapsed) {
  background-color: #e9ecef;
  color: #495057;
}
</style>
