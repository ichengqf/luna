import {Component, Input, OnInit} from '@angular/core';
import {Terminal} from 'xterm';
import {HttpService, LogService} from '../../../app.service';
import {Replay} from '../replay.model';

function zeroPad(num, minLength) {
  let str = num.toString();
  // Add leading zeroes until string is long enough
  while (str.length < minLength) {
    str = '0' + str;
  }
  return str;
}

function formatTimeWithSeconds(seconds) {
  let hour = 0, minute = 0, second = 0;
  const ref = [3600, 60, 1];
  for (let i = 0; i < ref.length; i++) {
    const val = ref[i];
    while (val <= seconds) {
      seconds -= val;
      switch (i) {
        case 0:
          hour++;
          break;
        case 1:
          minute++;
          break;
        case 2:
          second++;
          break;
      }
    }
  }
  return [hour, minute, second];
}

function formatTime(millis: number) {
  const totalSeconds = millis / 1000;
  const [hour, minute, second] = formatTimeWithSeconds(totalSeconds);
  let time = zeroPad(minute, 2) + ':' + zeroPad(second, 2);
  if (hour > 0) {
    time = zeroPad(hour, 2) + ':' + time;
  }
  return time;
}


@Component({
  selector: 'app-replay-json',
  templateUrl: './json.component.html',
  styleUrls: ['./json.component.css']
})
export class JsonComponent implements OnInit {
  isPlaying = false;
  recording: any;
  playerRef: any;
  displayRef: any;
  max = 0;
  time = 0;
  duration = '00:00';
  timeList = [];
  replayData = {};
  speed = 2;
  tick = 33; // 每33s滴答一次
  timeStep = 33; // 步长
  timer: any; // 多长时间播放下一个
  pos = 0; // 播放点
  term: Terminal;
  get position() {
    return formatTime(this.time);
  }
  set position(data) {
  }
  @Input() replay: Replay;

  constructor(private _http: HttpService) {}

  ngOnInit() {
    this.term = new Terminal({
      fontFamily: '"Monaco", "Consolas", "monospace"',
      fontSize: 14,
      rightClickSelectsWord: true,
      theme: {
        background: '#1f1b1b'
      }
    });
    if (this.replay.src !== 'READY') {
      this._http.get_replay_data(this.replay.src)
        .subscribe(
          data => {
            this.replayData = data;
            this.timeList = Object.keys(this.replayData).map(Number);
            this.timeList = this.timeList.sort((a, b) => {
              return a - b;
            });
            this.max = this.timeList[this.timeList.length - 1] * 1000;
            this.duration = formatTime(this.max);
            this.toggle();
          },
          err => {
            alert('无法下载');
            console.log(err);
          }
        );
    }
  }

  restart() {
    clearInterval(this.timer);
    this.term.reset();
    this.pos = 0;
    this.isPlaying = true;
    this.timer = setInterval(() => {
      this.advance();
    }, this.tick);
  }

  toggle() {
    if (this.isPlaying) {
      clearInterval(this.timer);
      this.isPlaying = !this.isPlaying;
    } else {
      this.timer = setInterval(() => {
        this.advance();
      }, this.tick);
      this.isPlaying = !this.isPlaying;
    }
  }

  advance() {
    // 每个time间隔执行一次
    // for (let i in this.timeList) {
    // }
    for (; this.pos < this.timeList.length; this.pos++) {
      if (this.timeList[this.pos] * 1000 <= this.time) {
        this.term.write(this.replayData[this.timeList[this.pos].toString()]);
      } else {
        break;
      }
    }

    // 超过了总的时间点, 停止播放
    if (this.pos >= this.timeList.length) {
      this.isPlaying = !this.isPlaying;
      clearInterval(this.timer);
    }
    this.time += this.timeStep * this.speed;
  }

  stop() {
    clearInterval(this.timer);
    this.isPlaying = false;
  }

  speedUp() {
    this.speed += 1;
  }

  speedDown() {
    this.speed -= 1;
  }

  runFrom() {
    for (let i = 0; i < this.timeList.length; i++) {
      const v = this.timeList[i];
      const preTime = this.timeList[i - 1];
      if (this.time <= v * 1000 && this.time >= preTime * 1000) {
        this.time = v * 1000;
        this.pos = i;
        break;
      }
    }
    this.advance();
  }
}
