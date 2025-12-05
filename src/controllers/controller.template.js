import prisma from "../config/prismaClient.js";
import ApiError from "../utils/ApiError.js";

export const transformTemplate = (tpl) => ({
  _id: tpl.id,
  name: tpl.name,
  type: tpl.type,
  subject: tpl.subject,
  body: tpl.body,
  description: tpl.description,
  createdBy: tpl.createdBy,
  status: tpl.status,
  createdAt: tpl.createdAt,
  updatedAt: tpl.updatedAt,
});

export const createTemplate = async (req, res, next) => {
  try {
    const {
      name,
      type,
      subject = "",
      body,
      description = "",
      status = "Active",
    } = req.body;

    if (!name || !type || !body) {
      return next(new ApiError(400, "name, type and body are required"));
    }

    const existing = await prisma.template.findUnique({
      where: { name },
    });

    if (existing) {
      return next(new ApiError(409, "Template with this name already exists"));
    }

    const newTemplate = await prisma.template.create({
      data: {
        name,
        type,
        subject,
        body,
        description,
        status,
        createdBy: req.user?.id || "system",
      },
    });

    res.status(201).json({
      success: true,
      data: transformTemplate(newTemplate),
    });
  } catch (err) {
    next(new ApiError(500, err.message));
  }
};

export const getTemplates = async (req, res, next) => {
  try {
    // -------------------------
    // Pagination Fixes
    // -------------------------
    let page = parseInt(req.query.page);
    let limit = parseInt(req.query.limit);

    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;

    const skip = (page - 1) * limit;

    // -------------------------
    // Filters
    // -------------------------
    const { type, search = "" } = req.query;

    let filters = [];

    if (type) {
      filters.push({ type });
    }

    if (search.trim() !== "") {
      filters.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { body: { contains: search, mode: "insensitive" } },
          { subject: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    // Build final "where"
    const where = filters.length > 0 ? { AND: filters } : {}; // If no filters, avoid empty AND (Prisma error)

    // -------------------------
    // Query + Count
    // -------------------------
    const [data, total] = await Promise.all([
      prisma.template.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit, // always a valid number now
      }),
      prisma.template.count({ where }),
    ]);

    // -------------------------
    // Response
    // -------------------------
    res.status(200).json({
      success: true,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data: data.map(transformTemplate),
    });
  } catch (err) {
    next(new ApiError(500, err.message));
  }
};

export const getTemplateById = async (req, res, next) => {
  try {
    const tpl = await prisma.template.findUnique({
      where: { id: req.params.id },
    });

    if (!tpl) return next(new ApiError(404, "Template not found"));

    res.status(200).json({ success: true, data: transformTemplate(tpl) });
  } catch (err) {
    next(new ApiError(500, err.message));
  }
};

export const updateTemplate = async (req, res, next) => {
  try {
    const clean = { ...req.body };

    // Prisma forbidden update fields
    delete clean._id;
    delete clean.id;
    delete clean.createdAt;
    delete clean.updatedAt;

    const updated = await prisma.template.update({
      where: { id: req.params.id },
      data: clean,
    });

    res.status(200).json({ success: true, data: transformTemplate(updated) });
  } catch (err) {
    if (err.code === "P2025") {
      return next(new ApiError(404, "Template not found"));
    }
    next(new ApiError(500, err.message));
  }
};

export const deleteTemplate = async (req, res, next) => {
  try {
    await prisma.template.delete({
      where: { id: req.params.id },
    });

    res.status(200).json({ success: true, message: "Template deleted" });
  } catch (err) {
    if (err.code === "P2025") {
      return next(new ApiError(404, "Template not found"));
    }
    next(new ApiError(500, err.message));
  }
};
