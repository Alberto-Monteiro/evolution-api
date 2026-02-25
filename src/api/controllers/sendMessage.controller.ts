import { InstanceDto } from '@api/dto/instance.dto';
import {
  SendAudioDto,
  SendButtonsDto,
  SendChannelMediaDto,
  SendContactDto,
  SendListDto,
  SendLocationDto,
  SendMediaDto,
  SendPollDto,
  SendPtvDto,
  SendReactionDto,
  SendStatusDto,
  SendStickerDto,
  SendTemplateDto,
  SendTextDto,
} from '@api/dto/sendMessage.dto';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Logger } from '@config/logger.config';
import { BadRequestException } from '@exceptions';
import { isBase64, isURL } from 'class-validator';
import emojiRegex from 'emoji-regex';

const regex = emojiRegex();

function isEmoji(str: string) {
  if (str === '') return true;

  const match = str.match(regex);
  return match?.length === 1 && match[0] === str;
}

export class SendMessageController {
  constructor(private readonly waMonitor: WAMonitoringService) {}
  private readonly logger = new Logger('SendMessageController');

  private normalizeBase64Media(media?: string): string {
    if (typeof media !== 'string') {
      return '';
    }

    const dataUriMatch = media.match(/^data:[^;]+;base64,(.*)$/);
    if (dataUriMatch?.[1]) {
      return dataUriMatch[1];
    }

    return media;
  }

  public async sendTemplate({ instanceName }: InstanceDto, data: SendTemplateDto) {
    return await this.waMonitor.waInstances[instanceName].templateMessage(data);
  }

  public async sendText({ instanceName }: InstanceDto, data: SendTextDto) {
    return await this.waMonitor.waInstances[instanceName].textMessage(data);
  }

  public async sendMedia({ instanceName }: InstanceDto, data: SendMediaDto, file?: any) {
    const instance = this.waMonitor.waInstances[instanceName];
    const isNewsletter = data?.number?.includes('@newsletter');

    if (isNewsletter && data?.mediatype === 'image' && typeof instance.channelMediaMessage === 'function') {
      const normalizedMedia = file ? file.buffer.toString('base64') : this.normalizeBase64Media(data?.media);
      const isMediaUrl = isURL(normalizedMedia);
      const isMediaBase64 = isBase64(normalizedMedia);

      if (!isMediaUrl && !isMediaBase64) {
        throw new BadRequestException('Owned media must be a url or base64');
      }

      return await instance.channelMediaMessage({
        number: data.number,
        media: normalizedMedia,
        text: data?.caption,
        delay: data?.delay,
        quoted: data?.quoted,
        mentionsEveryOne: data?.mentionsEveryOne,
        mentioned: data?.mentioned,
        encoding: data?.encoding,
        messageId: data?.messageId,
      });
    }

    if (isBase64(data?.media) && !data?.fileName && data?.mediatype === 'document') {
      throw new BadRequestException('For base64 the file name must be informed.');
    }

    if (file || isURL(data?.media) || isBase64(data?.media)) {
      return await instance.mediaMessage(data, file);
    }
    throw new BadRequestException('Owned media must be a url or base64');
  }

  public async sendChannelMedia({ instanceName }: InstanceDto, data: SendChannelMediaDto) {
    const normalizedMedia = this.normalizeBase64Media(data?.media);
    const isMediaUrl = isURL(normalizedMedia);
    const isMediaBase64 = isBase64(normalizedMedia);

    this.logger.log({
      action: 'sendChannelMedia',
      instanceName,
      number: data?.number,
      isNewsletter: data?.number?.includes('@newsletter'),
      mediaType: isMediaUrl ? 'url' : isMediaBase64 ? 'base64' : 'invalid',
      mediaLength: normalizedMedia?.length ?? 0,
      hasText: Boolean(data?.text),
      textLength: data?.text?.length ?? 0,
      delay: data?.delay,
    });

    if (!isMediaUrl && !isMediaBase64) {
      throw new BadRequestException('Owned media must be a url or base64');
    }

    const instance = this.waMonitor.waInstances[instanceName];
    const payload: SendChannelMediaDto = { ...data, media: normalizedMedia };

    if (typeof instance.channelMediaMessage === 'function') {
      this.logger.log({
        action: 'sendChannelMedia',
        instanceName,
        path: 'channelMediaMessage',
      });
      return await instance.channelMediaMessage(payload);
    }

    this.logger.warn({
      action: 'sendChannelMedia',
      instanceName,
      path: 'fallback-mediaMessage',
    });

    return await instance.mediaMessage({
      number: payload.number,
      mediatype: 'image',
      media: payload.media,
      caption: payload.text,
      delay: payload.delay,
      quoted: payload.quoted,
      mentionsEveryOne: payload.mentionsEveryOne,
      mentioned: payload.mentioned,
      encoding: payload.encoding,
    });
  }

  public async sendPtv({ instanceName }: InstanceDto, data: SendPtvDto, file?: any) {
    if (file || isURL(data?.video) || isBase64(data?.video)) {
      return await this.waMonitor.waInstances[instanceName].ptvMessage(data, file);
    }
    throw new BadRequestException('Owned media must be a url or base64');
  }

  public async sendSticker({ instanceName }: InstanceDto, data: SendStickerDto, file?: any) {
    if (file || isURL(data.sticker) || isBase64(data.sticker)) {
      return await this.waMonitor.waInstances[instanceName].mediaSticker(data, file);
    }
    throw new BadRequestException('Owned media must be a url or base64');
  }

  public async sendWhatsAppAudio({ instanceName }: InstanceDto, data: SendAudioDto, file?: any) {
    if (file?.buffer || isURL(data.audio) || isBase64(data.audio)) {
      // Si file existe y tiene buffer, o si es una URL o Base64, continúa
      return await this.waMonitor.waInstances[instanceName].audioWhatsapp(data, file);
    } else {
      console.error('El archivo no tiene buffer o el audio no es una URL o Base64 válida');
      throw new BadRequestException('Owned media must be a url, base64, or valid file with buffer');
    }
  }

  public async sendButtons({ instanceName }: InstanceDto, data: SendButtonsDto) {
    return await this.waMonitor.waInstances[instanceName].buttonMessage(data);
  }

  public async sendLocation({ instanceName }: InstanceDto, data: SendLocationDto) {
    return await this.waMonitor.waInstances[instanceName].locationMessage(data);
  }

  public async sendList({ instanceName }: InstanceDto, data: SendListDto) {
    return await this.waMonitor.waInstances[instanceName].listMessage(data);
  }

  public async sendContact({ instanceName }: InstanceDto, data: SendContactDto) {
    return await this.waMonitor.waInstances[instanceName].contactMessage(data);
  }

  public async sendReaction({ instanceName }: InstanceDto, data: SendReactionDto) {
    if (!isEmoji(data.reaction)) {
      throw new BadRequestException('Reaction must be a single emoji or empty string');
    }
    return await this.waMonitor.waInstances[instanceName].reactionMessage(data);
  }

  public async sendPoll({ instanceName }: InstanceDto, data: SendPollDto) {
    return await this.waMonitor.waInstances[instanceName].pollMessage(data);
  }

  public async sendStatus({ instanceName }: InstanceDto, data: SendStatusDto, file?: any) {
    return await this.waMonitor.waInstances[instanceName].statusMessage(data, file);
  }
}
