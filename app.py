from flask import Flask, request, jsonify, send_file
from huggingface_hub import InferenceClient
from PIL import Image
import io
import base64

app = Flask(__name__)

# 初始化 Hugging Face 客户端
client = InferenceClient(
    "CompVis/stable-diffusion-v1-4", 
    token="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"
)

@app.route('/api/generate-image', methods=['POST'])
def generate_image():
    try:
        # 获取提示词
        data = request.json
        prompt = data.get('prompt')
        
        if not prompt:
            return jsonify({'error': '提示词不能为空'}), 400

        # 生成图像
        image = client.text_to_image(prompt)
        
        # 将 PIL.Image 转换为 base64 字符串
        buffered = io.BytesIO()
        image.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        return jsonify({
            'success': True,
            'image': f'data:image/png;base64,{img_str}'
        })

    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True) 