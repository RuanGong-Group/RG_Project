/**
 * 统一的API响应格式工具
 * 确保所有接口返回格式一致
 */

/**
 * 成功响应
 * @param data 返回的数据
 * @param message 成功消息
 */
export function successResponse<T>(data: T, message: string = '操作成功') {
  return {
    success: true,
    message,
    data
  };
}

/**
 * 错误响应
 * @param message 错误消息
 * @param statusCode HTTP状态码（可选）
 */
export function errorResponse(message: string, statusCode?: number) {
  const response: {
    success: false;
    message: string;
    statusCode?: number;
  } = {
    success: false,
    message
  };

  if (statusCode) {
    response.statusCode = statusCode;
  }

  return response;
}

/**
 * 分页响应
 * @param data 数据列表
 * @param total 总数
 * @param page 当前页
 * @param pageSize 每页大小
 * @param message 消息
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  message: string = '获取成功'
) {
  return {
    success: true,
    message,
    data: {
      list: data,
      pagination: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      }
    }
  };
}
