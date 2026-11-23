import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { testConfig } from '../config/env.config';

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  headers: Record<string, unknown>;
  durationMs: number;
}

export class TestHttpClient {
  private readonly client: AxiosInstance;
  private token: string | null = null;

  constructor(baseURL: string = testConfig.baseUrl) {
    this.client = axios.create({
      baseURL,
      timeout: testConfig.timeoutMs,
      validateStatus: () => true, // Không throw exception khi status >= 400 để test assertion được
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private buildConfig(customConfig?: AxiosRequestConfig): AxiosRequestConfig {
    const config: AxiosRequestConfig = { ...customConfig };
    config.headers = {
      ...config.headers,
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
    return config;
  }

  async get<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const start = Date.now();
    const res: AxiosResponse<T> = await this.client.get(url, this.buildConfig(config));
    return {
      status: res.status,
      data: res.data,
      headers: res.headers as Record<string, unknown>,
      durationMs: Date.now() - start,
    };
  }

  async post<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const start = Date.now();
    const res: AxiosResponse<T> = await this.client.post(url, data, this.buildConfig(config));
    return {
      status: res.status,
      data: res.data,
      headers: res.headers as Record<string, unknown>,
      durationMs: Date.now() - start,
    };
  }

  async patch<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const start = Date.now();
    const res: AxiosResponse<T> = await this.client.patch(url, data, this.buildConfig(config));
    return {
      status: res.status,
      data: res.data,
      headers: res.headers as Record<string, unknown>,
      durationMs: Date.now() - start,
    };
  }

  async put<T = unknown>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const start = Date.now();
    const res: AxiosResponse<T> = await this.client.put(url, data, this.buildConfig(config));
    return {
      status: res.status,
      data: res.data,
      headers: res.headers as Record<string, unknown>,
      durationMs: Date.now() - start,
    };
  }

  async delete<T = unknown>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const start = Date.now();
    const res: AxiosResponse<T> = await this.client.delete(url, this.buildConfig(config));
    return {
      status: res.status,
      data: res.data,
      headers: res.headers as Record<string, unknown>,
      durationMs: Date.now() - start,
    };
  }
}
