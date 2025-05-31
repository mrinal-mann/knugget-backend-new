"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.openaiService = exports.OpenAIService = void 0;
const openai_1 = __importDefault(require("openai"));
const config_1 = require("../config");
const logger_1 = require("../config/logger");
const errorHandler_1 = require("../middleware/errorHandler");
const types_1 = require("../types");
class OpenAIService {
    constructor() {
        this.client = new openai_1.default({
            apiKey: config_1.config.openai.apiKey,
        });
    }
    async generateSummary(transcript, videoMetadata) {
        try {
            const transcriptText = this.formatTranscriptForAI(transcript);
            if (transcriptText.length > types_1.MAX_TRANSCRIPT_LENGTH) {
                return this.generateSummaryFromChunks(transcript, videoMetadata);
            }
            const prompt = this.createSummaryPrompt(transcriptText, videoMetadata);
            const completion = await this.client.chat.completions.create({
                model: config_1.config.openai.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an AI assistant specialized in creating concise, insightful summaries of YouTube videos. You extract key points, themes, and actionable insights from video transcripts.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: config_1.config.openai.maxTokens,
                temperature: 0.3,
                response_format: { type: 'json_object' }
            });
            const responseText = completion.choices[0]?.message?.content;
            if (!responseText) {
                throw new errorHandler_1.AppError('Empty response from OpenAI', 500);
            }
            let summaryData;
            try {
                summaryData = JSON.parse(responseText);
            }
            catch (parseError) {
                logger_1.logger.error('Failed to parse OpenAI response', { responseText, parseError });
                throw new errorHandler_1.AppError('Invalid response format from AI', 500);
            }
            if (!this.validateSummaryResponse(summaryData)) {
                throw new errorHandler_1.AppError('Invalid summary response structure', 500);
            }
            logger_1.logger.info('Summary generated successfully', {
                videoId: videoMetadata.videoId,
                keyPointsCount: summaryData.keyPoints.length,
                tagsCount: summaryData.tags.length,
                transcriptLength: transcriptText.length,
            });
            return { success: true, data: summaryData };
        }
        catch (error) {
            logger_1.logger.error('Summary generation failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                videoId: videoMetadata.videoId,
                transcriptLength: transcript.length,
            });
            if (error instanceof errorHandler_1.AppError) {
                throw error;
            }
            if (error instanceof openai_1.default.APIError && error.code === 'insufficient_quota') {
                throw new errorHandler_1.AppError('AI service quota exceeded', 503);
            }
            if (error instanceof openai_1.default.APIError && error.code === 'rate_limit_exceeded') {
                throw new errorHandler_1.AppError('AI service rate limit exceeded', 429);
            }
            throw new errorHandler_1.AppError('Summary generation failed', 500);
        }
    }
    async generateSummaryFromChunks(transcript, videoMetadata) {
        try {
            const chunks = this.chunkTranscript(transcript);
            const chunkSummaries = [];
            for (let i = 0; i < chunks.length; i++) {
                const chunkText = this.formatTranscriptForAI(chunks[i]);
                const chunkPrompt = this.createChunkSummaryPrompt(chunkText, i + 1, chunks.length);
                const completion = await this.client.chat.completions.create({
                    model: config_1.config.openai.model,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an AI assistant that creates concise summaries of video transcript chunks.'
                        },
                        {
                            role: 'user',
                            content: chunkPrompt
                        }
                    ],
                    max_tokens: 500,
                    temperature: 0.3,
                });
                const chunkSummary = completion.choices[0]?.message?.content;
                if (chunkSummary) {
                    chunkSummaries.push(chunkSummary);
                }
                if (i < chunks.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            const combinedSummary = chunkSummaries.join('\n\n');
            const finalPrompt = this.createFinalSummaryPrompt(combinedSummary, videoMetadata);
            const finalCompletion = await this.client.chat.completions.create({
                model: config_1.config.openai.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an AI assistant that creates final summaries from multiple text chunks, extracting key points and themes.'
                    },
                    {
                        role: 'user',
                        content: finalPrompt
                    }
                ],
                max_tokens: config_1.config.openai.maxTokens,
                temperature: 0.3,
                response_format: { type: 'json_object' }
            });
            const finalResponseText = finalCompletion.choices[0]?.message?.content;
            if (!finalResponseText) {
                throw new errorHandler_1.AppError('Empty response from OpenAI', 500);
            }
            const summaryData = JSON.parse(finalResponseText);
            if (!this.validateSummaryResponse(summaryData)) {
                throw new errorHandler_1.AppError('Invalid summary response structure', 500);
            }
            logger_1.logger.info('Chunked summary generated successfully', {
                videoId: videoMetadata.videoId,
                chunksProcessed: chunks.length,
                keyPointsCount: summaryData.keyPoints.length,
            });
            return { success: true, data: summaryData };
        }
        catch (error) {
            logger_1.logger.error('Chunked summary generation failed', { error, videoId: videoMetadata.videoId });
            throw error instanceof errorHandler_1.AppError ? error : new errorHandler_1.AppError('Summary generation failed', 500);
        }
    }
    chunkTranscript(transcript) {
        const chunks = [];
        const maxChunkLength = Math.floor(types_1.MAX_TRANSCRIPT_LENGTH / 3);
        let currentChunk = [];
        let currentLength = 0;
        for (const segment of transcript) {
            const segmentLength = segment.text.length;
            if (currentLength + segmentLength > maxChunkLength && currentChunk.length > 0) {
                chunks.push([...currentChunk]);
                currentChunk = [segment];
                currentLength = segmentLength;
            }
            else {
                currentChunk.push(segment);
                currentLength += segmentLength;
            }
        }
        if (currentChunk.length > 0) {
            chunks.push(currentChunk);
        }
        return chunks;
    }
    formatTranscriptForAI(transcript) {
        return transcript
            .map(segment => `[${segment.timestamp}] ${segment.text}`)
            .join('\n');
    }
    createSummaryPrompt(transcriptText, videoMetadata) {
        return `
Please analyze this YouTube video transcript and create a comprehensive summary.

Video Title: "${videoMetadata.title}"
Channel: ${videoMetadata.channelName}
Duration: ${videoMetadata.duration || 'Unknown'}

Transcript:
${transcriptText}

Please provide a JSON response with the following structure:
{
  "keyPoints": [
    "First key insight or main point (be specific and actionable)",
    "Second key insight or main point",
    "Third key insight or main point",
    "Fourth key insight or main point (if applicable)",
    "Fifth key insight or main point (if applicable)"
  ],
  "fullSummary": "A comprehensive 2-3 paragraph summary that captures the essence, main arguments, and conclusions of the video. Focus on what viewers would find most valuable and actionable.",
  "tags": [
    "relevant-topic-1",
    "relevant-topic-2",
    "relevant-topic-3",
    "relevant-topic-4",
    "relevant-topic-5"
  ]
}

Guidelines:
- Extract 3-5 key points that represent the most important insights
- Key points should be specific, actionable, and valuable to the viewer
- Full summary should be comprehensive but concise (200-400 words)
- Tags should be relevant keywords that categorize the content
- Focus on practical value and main takeaways
- Maintain the original meaning while making it more accessible
`.trim();
    }
    createChunkSummaryPrompt(chunkText, chunkNumber, totalChunks) {
        return `
This is chunk ${chunkNumber} of ${totalChunks} from a YouTube video transcript.

Transcript Chunk:
${chunkText}

Please provide a concise summary of the key points and important information in this chunk. Focus on:
- Main ideas and concepts discussed
- Important details or insights
- Any conclusions or recommendations

Keep the summary to 2-3 sentences maximum.
`.trim();
    }
    createFinalSummaryPrompt(combinedSummary, videoMetadata) {
        return `
Please create a comprehensive summary from these chunk summaries of a YouTube video.

Video Title: "${videoMetadata.title}"
Channel: ${videoMetadata.channelName}

Chunk Summaries:
${combinedSummary}

Please provide a JSON response with the following structure:
{
  "keyPoints": [
    "First key insight or main point",
    "Second key insight or main point",
    "Third key insight or main point",
    "Fourth key insight or main point (if applicable)",
    "Fifth key insight or main point (if applicable)"
  ],
  "fullSummary": "A comprehensive summary that synthesizes all the chunk summaries into a coherent overview of the entire video",
  "tags": [
    "relevant-topic-1",
    "relevant-topic-2",
    "relevant-topic-3",
    "relevant-topic-4",
    "relevant-topic-5"
  ]
}

Guidelines:
- Synthesize the chunk summaries into 3-5 key points
- Create a comprehensive full summary that covers the entire video
- Include relevant tags for categorization
- Focus on the most valuable insights and takeaways
`.trim();
    }
    validateSummaryResponse(response) {
        return (response &&
            Array.isArray(response.keyPoints) &&
            response.keyPoints.length > 0 &&
            response.keyPoints.every((point) => typeof point === 'string') &&
            typeof response.fullSummary === 'string' &&
            response.fullSummary.length > 0 &&
            Array.isArray(response.tags) &&
            response.tags.every((tag) => typeof tag === 'string'));
    }
    async testConnection() {
        try {
            const completion = await this.client.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5,
            });
            const hasResponse = !!completion.choices[0]?.message?.content;
            return { success: true, data: hasResponse };
        }
        catch (error) {
            logger_1.logger.error('OpenAI connection test failed', { error });
            return { success: false, error: 'OpenAI connection failed' };
        }
    }
}
exports.OpenAIService = OpenAIService;
exports.openaiService = new OpenAIService();
//# sourceMappingURL=openai.js.map