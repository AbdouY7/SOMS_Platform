// src/modules/posts/posts.controller.js
import { ok } from '../../utils/response.js';
import { AppError } from '../../utils/AppError.js';
import { asyncHandler, parseRequest } from '../../utils/http.js';
import { postsService } from './posts.service.js';
import { createPostSchema, updatePostSchema, postIdSchema, listPostsSchema } from './posts.schema.js';

function companyOf(req) {
  if (!req.user?.companyId) throw new AppError('This action needs a company account', 403, 'COMPANY_REQUIRED');
  return req.user.companyId;
}

export const list = asyncHandler(async (req, res) => {
  const { query } = parseRequest(listPostsSchema, req);
  ok(res, await postsService.list(query, companyOf(req)));
});

export const create = asyncHandler(async (req, res) => {
  const { body } = parseRequest(createPostSchema, req);
  ok(res, await postsService.create(body, companyOf(req), req.user.id), 201);
});

export const update = asyncHandler(async (req, res) => {
  const { params, body } = parseRequest(updatePostSchema, req);
  ok(res, await postsService.update(params.id, body, companyOf(req), req.user.id));
});

export const remove = asyncHandler(async (req, res) => {
  const { params } = parseRequest(postIdSchema, req);
  ok(res, await postsService.remove(params.id, companyOf(req), req.user.id));
});
