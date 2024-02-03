import argparse
import json
import os
import re
import signal
import subprocess
import sys
import traceback

import psutil
from PyQt5.QtCore import Qt, QUrl, QTimer, QStandardPaths
from PyQt5.QtWidgets import QApplication, QWidget, QHBoxLayout, QVBoxLayout, QPushButton, QSlider, QLabel, \
    QDesktopWidget, QProgressBar, QLineEdit, QMessageBox, QFileDialog
from PyQt5.QtMultimedia import QMediaPlayer, QMediaContent
from PyQt5.QtMultimediaWidgets import QVideoWidget
from PyQt5.QtGui import QIcon
import resources_rc


class VideoEditer(QWidget):
    def __init__(self, mode, video_url, video_type, output_file_name, ffprobe_path, ffmpeg_path):
        super().__init__()
        self.mediaPlayer = QMediaPlayer(None, QMediaPlayer.VideoSurface)
        self.videoWidget = QVideoWidget()
        self.process = None
        self.video_url = video_url
        self.video_mode = mode
        self.output_file_name = output_file_name
        if video_type:
            self.video_type = video_type
        else:
            self.video_type = video_url.split('.')[video_url.split('.').__len__()-1]
        if self.video_type == 'rmvb' or self.video_type == 'mkv':
            self.video_type = 'mp4'
        self.ffprobe_path = ffprobe_path
        self.ffmpeg_path = ffmpeg_path
        self.frame_rate = 0
        self.total_frame_count = 0
        self.bit_rate = 200

        self.initUI()

    def initUI(self):
        # 隐藏标题栏
        self.setWindowFlags(Qt.FramelessWindowHint)

        # 主布局main_layout 垂直布局 分上（title_bar）、下（videoWidget_layout）两个区域
        # 下部分区域videoWidget_layout 垂直布局 分上（videoWidget）、下（control_layout）两个区域
        # control_layout 水平布局 包含了进度条和视频剪辑相关的操作元素
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # 自定义标题栏
        title_bar = QWidget(self)
        title_bar.setStyleSheet("background-color:rgb(6,86,171);min-height:44px;padding:0px 16px")
        title_layout = QHBoxLayout(title_bar)
        title_label = QLabel()
        title_label.setContentsMargins(0, 0, 0, 0)
        title_text = ''
        if self.video_mode == 'edit':
            title_text = '视频编辑'
        if self.video_mode == 'play':
            title_text = '视频预览'
        if self.video_mode == 'pic':
            title_text = '图片预览'
        title_label.setText(
            f"<html><body><p style='font-size:20px;font-weight:bold;margin:0px;font-family:Microsoft JhengHei;color:#ffffff'>{title_text}</p></body></html>")
        title_layout.addWidget(title_label, alignment=Qt.AlignLeft)
        title_layout.setContentsMargins(0, 0, 0, 0)
        self.close_button = QPushButton(self)
        self.close_button.setIcon(QIcon(':close.png'))
        self.close_button.setIconSize(self.close_button.size())
        self.close_button.setStyleSheet("border:none;max-width:22px;max-height:22px;")
        self.close_button.setCursor(Qt.PointingHandCursor)
        self.close_button.clicked.connect(self.close)
        title_layout.addWidget(self.close_button, alignment=Qt.AlignRight | Qt.AlignVCenter)
        main_layout.addWidget(title_bar)

        # 视频播放区域
        self.videoWidget.setMinimumSize(1400, 700)
        self.videoWidget.setStyleSheet("background-color:#000000;")
        self.videoWidget_layout = QVBoxLayout()
        self.videoWidget_layout.setContentsMargins(5, 5, 5, 5)
        self.videoWidget_layout.addWidget(self.videoWidget)
        # loading
        self.loadingLabel = QLabel('Loading...')
        self.loadingLabel.setAlignment(Qt.AlignCenter | Qt.AlignVCenter)
        self.loadingLabel.setStyleSheet("color:#000000;font-size:16px;")
        self.videoWidget_layout.addWidget(self.loadingLabel, alignment=Qt.AlignCenter)

        # 控制区域
        control_widget = QWidget(self)
        control_layout = QHBoxLayout()  # 使用水平布局
        control_layout.setContentsMargins(0, 0, 0, 0)
        control_layout.setSpacing(0)
        control_widget.setLayout(control_layout)
        control_widget.setStyleSheet("background-color:#2b333f;font-family:Microsoft JhengHei;")
        self.playButton = QPushButton(self)
        self.playButton.setIcon(QIcon(':play.png'))
        self.playButton.setCursor(Qt.PointingHandCursor)
        self.playButton.setStyleSheet("border:none;min-width:40px;min-height:30px")
        self.playButton.clicked.connect(self.playClicked)
        control_layout.addWidget(self.playButton, alignment=Qt.AlignLeft)
        self.slider = QSlider(Qt.Horizontal)
        self.slider.sliderMoved.connect(self.setPosition) #拖动进度条会对应事件，相应的改变mediaPlayer的进度即可
        control_layout.addWidget(self.slider)
        self.time_label = QLabel('00:00 / 00:00')
        self.time_label.setAlignment(Qt.AlignCenter)
        self.time_label.setContentsMargins(0, 0, 0, 0)
        self.time_label.setStyleSheet("color:#ffffff;min-width:110px")
        control_layout.addWidget(self.time_label)
        if self.video_mode == 'pic':
            control_widget.setVisible(False)
        if self.video_mode == 'play':
            self.frame_label = QLabel(f'当前帧:0/{self.total_frame_count}', self)
            self.frame_label.setAlignment(Qt.AlignCenter)
            self.frame_label.setContentsMargins(0, 0, 0, 0)
            self.frame_label.setStyleSheet("color:#ffffff;margin-right:10px")
            control_layout.addWidget(self.frame_label)
            self.prev_frame_btn = QPushButton('上一帧', self)
            self.prev_frame_btn.setStyleSheet("background-color:#ffffff;margin-right:5px;min-width:60px;min-height:20px")
            self.prev_frame_btn.clicked.connect(self.previousFrameClicked)
            control_layout.addWidget(self.prev_frame_btn)
            self.next_frame_btn = QPushButton('下一帧', self)
            self.next_frame_btn.setStyleSheet("background-color:#ffffff;margin-right:10px;min-width:60px;min-height:20px")
            self.next_frame_btn.clicked.connect(self.nextFrameClicked)
            control_layout.addWidget(self.next_frame_btn)
            self.jump_frame_input = QLineEdit(self)
            self.jump_frame_input.setStyleSheet("background-color:#ffffff;border:1px solid white;margin-right:10px")
            self.jump_frame_input.setFixedWidth(80)
            self.jump_frame_input.setText("1")
            control_layout.addWidget(self.jump_frame_input)
            # self.jump_to_frame_button = QPushButton('跳转', self)
            # self.jump_to_frame_button.setStyleSheet("background-color:#ffffff;margin-right:10px;min-width:60px;min-height:20px")
            # self.jump_to_frame_button.clicked.connect(self.jumpToFrameClicked)
            # control_layout.addWidget(self.jump_to_frame_button)

        self.videoWidget_layout.addWidget(control_widget)
        main_layout.addLayout(self.videoWidget_layout)

        # 剪辑相关
        if self.video_mode == 'edit':
            resolution_label = QLabel('输出分辨率:', self)
            resolution_label.setStyleSheet("color:#ffffff;padding-right:2px")
            control_layout.addWidget(resolution_label)
            self.resolution_input_x = QLineEdit(self)
            self.resolution_input_x.setStyleSheet("background-color:#ffffff;border:1px solid white")
            self.resolution_input_x.setFixedWidth(40)
            self.resolution_input_y = QLineEdit(self)
            self.resolution_input_y.setStyleSheet("background-color:#ffffff;border:1px solid white")
            self.resolution_input_y.setFixedWidth(40)
            control_layout.addWidget(self.resolution_input_x)
            resolution_label_x = QLabel('x', self)
            resolution_label_x.setStyleSheet("color:#ffffff;padding:0px 1px")
            control_layout.addWidget(resolution_label_x)
            control_layout.addWidget(self.resolution_input_y)
            framerate_label = QLabel('输出帧率:', self)
            framerate_label.setStyleSheet("color:#ffffff;padding-left:4px;padding-right:2px")
            control_layout.addWidget(framerate_label)
            self.framerate_input = QLineEdit(self)
            self.framerate_input.setStyleSheet("background-color:#ffffff;border:1px solid white")
            self.framerate_input.setFixedWidth(30)
            control_layout.addWidget(self.framerate_input)
            time_range_label = QLabel('选择剪裁时间:', self)
            time_range_label.setStyleSheet("color:#ffffff;padding-left:4px;padding-right:2px")
            control_layout.addWidget(time_range_label)
            self.start_time_input = QLineEdit(self)
            self.start_time_input.setStyleSheet("background-color:#ffffff;border:1px solid white")
            self.start_time_input.setText("00:00:00")
            self.start_time_input.setFixedWidth(60)
            self.end_time_input = QLineEdit(self)
            self.end_time_input.setStyleSheet("background-color:#ffffff;border:1px solid white")
            self.end_time_input.setText("00:00:00")
            self.end_time_input.setFixedWidth(60)
            control_layout.addWidget(self.start_time_input)
            to_label = QLabel('至:', self)
            to_label.setStyleSheet("color:#ffffff;padding:0px 1px")
            control_layout.addWidget(to_label)
            control_layout.addWidget(self.end_time_input)
            output_file_label = QLabel('输出文件路径:', self)
            output_file_label.setStyleSheet("color:#ffffff;padding-left:4px;padding-right:2px")
            control_layout.addWidget(output_file_label)
            self.output_file_input = QLabel(self)
            desktop_path = QStandardPaths.writableLocation(QStandardPaths.DesktopLocation)
            default_file_path = f"{desktop_path}/output.{self.video_type}"
            self.output_file_input.setText(default_file_path)
            self.output_file_input.setStyleSheet("color:#ffffff;font-size:12px;padding-right:4px")
            control_layout.addWidget(self.output_file_input)
            self.browse_button = QPushButton('选择文件夹', self)
            self.browse_button.setStyleSheet("min-height:20px;background-color:#ffffff;margin-right:6px;padding:0px 4px")
            self.browse_button.clicked.connect(self.browseOutputFile)
            control_layout.addWidget(self.browse_button)
            self.progress_bar = QProgressBar(self)
            self.progress_bar.setStyleSheet("color:#ffffff;")
            self.progress_bar.setRange(0, 100)
            self.progress_bar.setValue(0)
            control_layout.addWidget(self.progress_bar)
            self.export_button = QPushButton('导出', self)
            self.export_button.setStyleSheet("background-color:#ffffff;")
            self.stop_button = QPushButton('停止', self)
            self.stop_button.setStyleSheet("background-color:#ffffff;")
            self.export_button.setVisible(True)
            self.stop_button.setVisible(False)
            self.stop_button.clicked.connect(self.stopExport)
            self.export_button.clicked.connect(self.exportVideo)
            control_layout.addWidget(self.export_button)
            control_layout.addWidget(self.stop_button)
            self.process_video_timer = QTimer(self)  # 这个计时器用来获取视频导出进度
            self.process_video_timer.timeout.connect(self.checkExportProgress)
            self.process_video_timer.stop()

        self.mediaPlayer.setVideoOutput(self.videoWidget)
        self.mediaPlayer.positionChanged.connect(self.positionChanged)
        self.mediaPlayer.durationChanged.connect(self.durationChanged)
        self.mediaPlayer.mediaStatusChanged.connect(self.mediaStatusChanged)

        self.setLayout(main_layout)

    def playClicked(self):
        if self.mediaPlayer.state() == QMediaPlayer.PlayingState or self.mediaPlayer.state() == QMediaPlayer.BufferedMedia:
            self.mediaPlayer.pause()
            self.playButton.setIcon(QIcon(':play.png'))
        else:
            self.mediaPlayer.play()
            self.playButton.setIcon(QIcon(':pause.png'))

    def positionChanged(self, position):
        self.slider.setValue(position)
        self.time_label.setText(f"{self.formatTime(position)} / {self.formatTime(self.mediaPlayer.duration())}")
        self.updateFrameNumber(position)

    def durationChanged(self, duration):
        print(f'durationChanged:{duration}')
        self.slider.setRange(0, duration)

    def setPosition(self, position):
        self.mediaPlayer.setPosition(position)

    def updateFrameNumber(self, position):
        # Calculate the current frame number based on the position
        current_frame = round(position * self.frame_rate / 1000)
        if self.video_mode == 'play':
            self.frame_label.setText(f'当前帧:{current_frame}/{self.total_frame_count}')

    def previousFrameClicked(self):
        # Move to the previous frame
        current_position = self.mediaPlayer.position()
        frame_rate = self.frame_rate
        new_position = current_position - int(self.jump_frame_input.text())*int(1000 / frame_rate)
        if new_position >= 0:
            self.mediaPlayer.setPosition(new_position)

    def nextFrameClicked(self):
        # Move to the next frame
        current_position = self.mediaPlayer.position()
        frame_rate = self.frame_rate
        new_position = current_position + int(self.jump_frame_input.text())*int(1000 / frame_rate)
        if new_position < self.mediaPlayer.duration():
            self.mediaPlayer.setPosition(new_position)

    # def jumpToFrameClicked(self):
    #     # Jump to the specified frame
    #     frame_number_text = self.jump_frame_input.text()
    #     try:
    #         target_frame = int(frame_number_text)
    #         if 0 <= target_frame <= self.total_frame_count:
    #             # Calculate the corresponding position and set it
    #             frame_rate = self.frame_rate
    #             target_position = round(target_frame * 1000 / frame_rate)
    #             self.mediaPlayer.setPosition(target_position)
    #         else:
    #             QMessageBox.warning(self, 'Error', '非法值')
    #     except ValueError:
    #         QMessageBox.warning(self, 'Error', '异常')

    def formatTime(self, millis):
        seconds = millis // 1000
        minutes, seconds = divmod(seconds, 60)
        return "{:02}:{:02}".format(minutes, seconds)

    def mediaStatusChanged(self, status):
        print("mediaStatusChanged:{}".format(status))
        if status == QMediaPlayer.LoadedMedia:
            self.loadingLabel.hide()
            self.playButton.setEnabled(True)
            # 视频加载完成
            if self.video_mode == 'play' or self.video_mode == 'pic':
                self.playClicked()  # 自动播放
            if self.video_mode != 'pic':
                self.get_video_info()
        elif status == QMediaPlayer.LoadingMedia:
            # 视频加载中
            self.loadingLabel.show()
            self.playButton.setEnabled(False)
        elif status == QMediaPlayer.InvalidMedia:
            # 视频加载失败
            # self.loadingLabel.hide()
            self.loadingLabel.setText('视频加载失败')
            self.playButton.setEnabled(False)

    def get_video_info(self):
        cmd = f'{self.ffprobe_path} -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration,nb_frames -show_entries format=bit_rate -of default=noprint_wrappers=1:nokey=1 "{self.video_url}"'
        print(f'cmd:{cmd}')
        result = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, text=True)
        if result.returncode == 0:
            info_lines = result.stdout.strip().split('\n')
            print(f'info_lines:{info_lines}')
            width = info_lines[0]
            height = info_lines[1]
            frame_rate = int(info_lines[2].split("/")[0]) / int(info_lines[2].split("/")[1])
            duration = info_lines[3]
            total_frame = info_lines[4]
            bit_rate = info_lines[5]
            ## mkv格式文件需要用其他命令获取总帧数和时长
            if duration == 'N/A':
                cmd = f'{self.ffprobe_path} -v error -show_entries format=duration -of json {self.video_url}'
                print(f'cmd:{cmd}')
                result = subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, text=True)
                result = json.loads(result.stdout)
                if 'format' in result and 'duration' in result['format']:
                    duration = result['format']['duration']
            if duration == 'N/A':
                if self.video_mode == 'play':
                    QMessageBox.question(self, '加载视频时长失败', '请检查视频文件,视频无法进行单帧多帧播放', QMessageBox.Yes)
                if self.video_mode == 'edit':
                    QMessageBox.question(self, '加载视频时长失败', '请检查视频文件,视频然可进行编辑', QMessageBox.Yes)
                duration = '0'
            if total_frame == "N/A":
                total_frame = int(float(duration) * frame_rate)
            self.total_frame_count = int(total_frame)
            self.frame_rate = int(frame_rate)
            if self.video_mode == 'edit':
                self.resolution_input_x.setText(width)
                self.resolution_input_y.setText(height)
                self.framerate_input.setText(str(int(frame_rate)))
                self.end_time_input.setText(self.format_duration(float(duration)))
                self.bit_rate = int(int(bit_rate) / 1000) if bit_rate != 'N/A' else 200
            print(f'width:{width} height:{height} frame_rate:{self.frame_rate} duration:{duration} '
                  f'total_frame_count:{self.total_frame_count} bit_rate:{self.bit_rate}')
        else:
            print(f"Error running ffprobe. Return code: {result.returncode}")
            QMessageBox.question(self, '加载视频失败', '请检查视频文件', QMessageBox.Yes)
            # self.disable_all()

    def exportVideo(self):
        self.mediaPlayer.pause()
        self.playButton.setIcon(QIcon(':play.png'))
        self.disable_all()
        self.export_button.setVisible(False)
        self.stop_button.setVisible(True)
        start_time_str = self.start_time_input.text()
        end_time_str = self.end_time_input.text()
        try:
            start_time = self.parseTime(start_time_str)
            end_time = self.parseTime(end_time_str)
            self.cut_duration = end_time-start_time

            if start_time >= end_time:
                QMessageBox.warning(self, 'Error', 'End time must be greater than start time.')
                return

            output_file = self.output_file_input.text()
            resolutionX = self.resolution_input_x.text()
            resolutionY = self.resolution_input_y.text()
            framerate = self.framerate_input.text()

            # Use FFmpeg to perform video clipping
            cmd = f'{self.ffmpeg_path} -ss {start_time} -i "{self.video_url}" -y -r {framerate} -filter:v scale=w={resolutionX}:h={resolutionY} -t {self.cut_duration} -b:v {self.bit_rate}k -f {self.video_type} {output_file}'
            print(f"cmd:{cmd}")
            self.process_video_timer.start()
            self.process = subprocess.Popen(
                cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1, encoding='utf-8'
            )
        except Exception as e:
            self.enable_all()
            self.export_button.setVisible(False)
            self.stop_button.setVisible(True)
            traceback.print_exc()

    def stopExport(self):
        if self.process:
            process = psutil.Process(self.process.pid)
            for child in process.children(recursive=True):
                child.terminate()
            self.progress_bar.setValue(0)
            self.process_video_timer.stop()
            self.enable_all()

        self.export_button.setVisible(True)
        self.stop_button.setVisible(False)

    def parseTime(self, time_str):
        # Helper function to convert time string to milliseconds
        h, m, s = map(int, time_str.split(':'))
        return h * 3600 + m * 60 + s

    def format_duration(self, duration):
        hours, remainder = divmod(duration, 3600)
        minutes, seconds = divmod(remainder, 60)
        return f"{int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}"

    def disable_all(self):
        self.start_time_input.setDisabled(True)
        self.end_time_input.setDisabled(True)
        self.resolution_input_x.setDisabled(True)
        self.resolution_input_y.setDisabled(True)
        self.framerate_input.setDisabled(True)
        self.browse_button.setDisabled(True)

    def enable_all(self):
        self.start_time_input.setDisabled(False)
        self.end_time_input.setDisabled(False)
        self.resolution_input_x.setDisabled(False)
        self.resolution_input_y.setDisabled(False)
        self.framerate_input.setDisabled(False)
        self.browse_button.setDisabled(False)

    def checkExportProgress(self):
        try:
            line = self.process.stderr.readline()
            if line:
                print(f'self.process.stderr:{line.strip()}')
                match = re.search(r'time=(\d+:\d+:\d+.\d+)', line)
                if match:
                    # 读取时间，转换成秒
                    elapsed_time_str = match.group(1)
                    elapsed_time_parts = list(map(float, re.split(r'[:.]', elapsed_time_str)))
                    elapsed_time_seconds = (
                            elapsed_time_parts[0] * 3600 + elapsed_time_parts[1] * 60 + elapsed_time_parts[2]
                    )
                    # 进度的当前剪裁至的时间/总剪裁时间
                    self.progress_percentage = (elapsed_time_seconds / self.cut_duration) * 100
                    self.progress_bar.setValue(int(self.progress_percentage))
            else:
                self.process_video_timer.stop()
                self.progress_bar.setValue(100)
                self.enable_all()
                self.export_button.setVisible(True)
                self.stop_button.setVisible(False)
        except Exception as e:
            self.process_video_timer.stop()
            self.progress_bar.setValue(100)
            self.enable_all()
            self.export_button.setVisible(True)
            self.stop_button.setVisible(False)
            traceback.print_exc()

    def browseOutputFile(self):
        options = QFileDialog.Options()
        options |= QFileDialog.DontUseNativeDialog
        file_path, _ = QFileDialog.getSaveFileName(self, "保存文件", self.output_file_input.text(),
                                                   "All Files (*)", options=options)

        if file_path:
            self.output_file_input.setText(file_path)

    def closeEvent(self, event):
        print("XXXXXXXXXXXXXXXXXX closeEvent XXXXXXXXXXXXXXXXXXXXXXXXX")
        # Handle the window close event
        if self.process and self.process.poll() is None:
            # The process is still running, kill it
            self.process.send_signal(signal.CTRL_BREAK_EVENT)
            self.process.terminate()
            self.process.wait()  # Wait for the process to finish
            self.process = None  # Reset the process variable

            # Call the base class implementation
        super().closeEvent(event)

def center_window(window):
    screen = QDesktopWidget().screenGeometry()
    size = window.geometry()
    x = (screen.width() - size.width()) // 2
    y = (screen.height() - size.height()) // 2
    window.move(x, y)

if __name__ == '__main__':
    app = QApplication(sys.argv)
    print("sys.argv:{}".format(sys.argv))

    parser = argparse.ArgumentParser()
    parser.add_argument('mode', choices=['play', 'edit', 'pic'], default='play', nargs='?')
    parser.add_argument('url_type', choices=['online', 'local'], default='local', nargs='?')
    parser.add_argument('video_type', default=None, nargs='?')
    parser.add_argument('video_url', default=None, nargs='?')
    parser.add_argument('export_file_name', default='output.mp4', nargs='?')
    args = parser.parse_args()

    mode = args.mode
    url_type = args.url_type
    video_url = args.video_url
    video_type = args.video_type
    export_file_name = args.export_file_name

    if not video_url:
        file_dialog = QFileDialog()
        file_dialog.setNameFilter("Video Files (*.mp4 *.avi *.rmvb *.mov *.mkv)")
        file_dialog.setWindowTitle("请选择视频文件")
        file_dialog.setFileMode(QFileDialog.ExistingFile)
        if file_dialog.exec_():
            selected_files = file_dialog.selectedFiles()
            if selected_files:
                video_url = selected_files[0]
    if not video_url:
        sys.exit(0)
    print(f"FFPROBE_PATH:{os.getenv('FFPROBE_PATH')} FFMPEG_PATH:{os.getenv('FFMPEG_PATH')}")
    player = VideoEditer(mode, video_url, video_type, export_file_name, os.getenv('FFPROBE_PATH', 'ffprobe.exe'), os.getenv('FFMPEG_PATH', 'ffmpeg.exe'))
    player.resize(1400, 700)  # 设置窗口大小为1400x700
    title_text = ''
    if mode == 'edit':
        player.setWindowTitle('视频编辑')
    if mode == 'play':
        player.setWindowTitle('视频预览')
    if mode == 'pic':
        player.setWindowTitle('图片预览')

    # 设置样式表
    styles_path = os.path.join(sys._MEIPASS, 'styles.qss') if getattr(sys, 'frozen', False) else 'styles.qss'
    if os.path.exists(styles_path):
        with open(styles_path, 'r') as style_file:
            player.setStyleSheet(style_file.read())
    # 指定在线视频地址
    if url_type == 'online':
        player.mediaPlayer.setMedia(QMediaContent(QUrl(video_url)))
    elif url_type == 'local':
        player.mediaPlayer.setMedia(QMediaContent(QUrl.fromLocalFile(video_url)))
    else:
        sys.exit(app.exec_())
    player.show()

    # 将窗口居中
    center_window(player)

    sys.exit(app.exec_())
