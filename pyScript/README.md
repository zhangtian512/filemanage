### 项目中包含图片
1. 新建文件resources.qrc
```js
<!DOCTYPE RCC>
<RCC version="1.0">
    <qresource>
        <file>path/to/images/image1.png</file>
        <file>path/to/images/image2.png</file>
        <file>path/to/images/image3.png</file>
        <!-- Add more <file> entries for additional images -->
    </qresource>
</RCC>
```

2. 执行命令 pyrcc5 -o resources_rc.py resources.qrc 生成resources_rc.py
3. 脚本中 import resources_rc
4. 设置图片 self.playButton.setIcon(QIcon(':play.png'))

### 打包成exe
pyinstaller --onefile --add-data "styles.qss;." videoEditor.py

### 依赖
1. K-Lite_Codec_Pack_1794_Basic.exe -- 解码器
2. dxwebsetup.exe -- windows directX

### pip清华源
pip install XXX -i https://pypi.tuna.tsinghua.edu.cn/simple