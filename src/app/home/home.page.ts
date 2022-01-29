import { Component, NgZone } from '@angular/core';
import { BluetoothSerial } from '@ionic-native/bluetooth-serial/ngx';
import { R900 } from '../rfid/r900';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  providers: [BluetoothSerial]
})
export class HomePage {
  public devices: Array<any> = [];
  public tags: Array<any> = [];
  public status: string = '';
  public connected: boolean = false;
  public inventoring: boolean = false;
  public requester: String = '';
  public batteryLevel: String = '';
  
  constructor(
    private bluetoothSerial: BluetoothSerial,
    private zone: NgZone
  ) {
    this.registerSubscribeData();
  }

  registerSubscribeData() {
    this.bluetoothSerial.subscribeRawData().subscribe((data) => {
      this.bluetoothSerial.readUntil("\r\n").then((data) => {
        console.log("read", data);
        if ((data.indexOf('online=0')) >= 0) {
          this.setConnection(false);
        }
        if ((data.indexOf('CONNECT F0D7AA6993CE')) >= 0) {
          this.setConnection(false);
        }
        this.parseTags(data);
        if (this.requester == 'battery') {
          this.zone.run(() => {
            this.batteryLevel = data.slice(6, 8);
            let result = data.match(/\d+/g);
            if (result && result.length) {
              this.batteryLevel = result[0];
              console.log('batteryLevel', this.batteryLevel);
            }
            this.clearRequester();
          });
        }
      });
    });
  }

  // sets of class
  setConnection(status) {
    this.zone.run(() => {
      this.connected = status;
    });
  }
  
  setRequester(param) {
    this.requester = param;
  }
  
  setStatus(status) {
    this.status = status;
  }

  clearRequester() {
    this.requester = '';
  }
  
  clearDevices() {
    this.devices = [];
  }

  clearTags(){
    this.tags = [];
  }


  openInterface(log: String = '', cb) {
    this.bluetoothSerial.write(R900.OPEN_INTERFACE_1).then(
      status => {
        cb(status)
      },
      err => {
        console.log('err', err);
      }
    )
  }

  scan() {
    this.bluetoothSerial.list().then(devicesFound => {
      this.devices = devicesFound;
      console.log('device:', this.devices)
    }, error => {
      console.log('error: ', error);
    });
  }
  
  connect(item:any, cb:any){
    if (!item) {
      return;
    }
    this.bluetoothSerial.connect(item.address).subscribe(
      status => {
        cb(status);
      },
      err => {
        console.log('Error on Connecting: ', err);
        this.setConnection(false);
      }
    )
  }
  
  public getBatteryLevel() {
    this.bluetoothSerial.write(R900.CMD_GET_BATT_LEVEL).then(
      data => {
        this.openInterface('Br.batt', () => console.log('Br.batt sucssess'));
        this.setRequester('battery');
      },
      error => {
        console.log(`There was an error: ${error}`);
      }
    );
  }

  public handleConnection(item) {
    if (!item) {
      return;
    }
    this.connect(item, (statusConnection) => {
      console.log('statusConnection: ', statusConnection);
      if (statusConnection == 'OK') {
        this.openInterface('from handleConnection', (statusOpenInterface) => {
          console.log('statusOpenInterface: ', statusOpenInterface);
          if (statusOpenInterface == 'OK') {
            this.zone.run(() => {
              this.connected = true;
              this.clearDevices();
            });
            this.getBatteryLevel();
          }
        })
      }
    })
  }

  getInventory() {
    this.bluetoothSerial.write(R900.CMD_INVENT).then(
      data => {
        this.inventoring = true;
        this.setRequester('inventário');
        this.openInterface('stop', () => { });
        console.log(data)
      },
      err => {
        console.log('err', err);
      }
    )
  }

  stop() {
    this.bluetoothSerial.write(R900.CMD_STOP).then(
      data => {
        console.log('stop', data);
        this.inventoring = false;
        this.openInterface('stop', () => { });
      },
      err => {
        console.log('err', err);
      }
    )
  }

// Read tags
parseTags(tags) {
  console.log(tags);
  let tagsSplited = tags.split('\r\n');
  tagsSplited.forEach(element => {
    this.isIncluded(element, () =>{
        this.zone.run(()=>{
          this.tags.push(element)
        });
    });
  });
}

isIncluded(element, cb) {
  let included = false;
  for (var i = 0; i < this.tags.length; i++) {
    if (this.tags[i] === element) {
      included = true;
      break;
    }
  }
  cb(included);
}
}