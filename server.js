const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const dotenv = require('dotenv');

// 配置环境变量
dotenv.config();

const app = express();

// 启用CORS和JSON解析
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static('public'));

// 火山方舟API配置
const API_KEY = process.env.API_KEY;
const API_URL = process.env.API_URL;
const port = process.env.PORT || 3000;

// 处理聊天请求
app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;

        // 设置请求头
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`
        };

        // 准备请求体
        const requestBody = {
            model: 'deepseek-r1-250120',
            messages: [
                {
                    role: 'system',
                    content: '你是一位专业的Life Coach，擅长通过对话帮助人们发现自己的潜力，制定目标，并提供实用的建议来促进个人成长。你的回答应该富有洞察力，同时保持温暖和支持性。'
                },
                {
                    role: 'user',
                    content: userMessage
                }
            ],
            stream: true,
            temperature: 0.6
        };

        // 发送请求到火山方舟API
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
            timeout: 60000 // 60秒超时
        });

        // 检查响应状态
        if (!response.ok) {
            const errorData = await response.json();
throw new Error(`API请求失败: ${response.status}, 错误信息: ${JSON.stringify(errorData)}`);
        }

        // 设置响应头
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');

        // 处理流式响应
        try {
            response.body.on('data', chunk => {
                const lines = chunk.toString().split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data:')) {
                        try {
                            const jsonData = JSON.parse(line.slice(5));
                            if (jsonData.choices && jsonData.choices[0].delta.content) {
                                res.write(jsonData.choices[0].delta.content);
                            }
                        } catch (e) {
                            console.error('解析响应数据失败:', e);
                        }
                    }
                }
            });

            response.body.on('end', () => {
                res.end();
            });
        } catch (error) {
            console.error('流式处理错误:', error);
            res.status(500).json({ error: '服务器处理请求失败' });
        }

    } catch (error) {
        console.error('服务器错误:', error);
        const errorMessage = error.message || '服务器处理请求失败';
        res.status(500).json({ error: errorMessage });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});