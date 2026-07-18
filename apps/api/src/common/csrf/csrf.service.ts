import { Injectable } from '@nestjs/common';
import { generateOpaqueToken } from '../tokens';

@Injectable()
export class CsrfService {
  generateToken(): string {
    return generateOpaqueToken();
  }
}
