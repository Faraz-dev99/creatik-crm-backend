import { PrismaClient } from "@prisma/client";
import ApiError from "../utils/ApiError.js";

const prisma = new PrismaClient();

// Mongo-like transformer
const transformLocation = (loc) => ({
  _id: loc.id,
  Name: loc.Name,
  Status: loc.Status,
  City: loc.City
    ? {
        _id: loc.City.id,
        Name: loc.City.Name,
        Status: loc.City.Status,
      }
    : null,
  createdAt: loc.createdAt,
  updatedAt: loc.updatedAt,
});

// ---------------------------------------------------
// GET ALL LOCATIONS
// ---------------------------------------------------
export const getLocation = async (req, res, next) => {
  try {
    const { keyword, limit, city } = req.query;

    let where = {};

    if (keyword) {
      where.Name = { contains: keyword.trim(), mode: "insensitive" };
    }

    if (city) {
      where.cityId = city;
    }

    const locations = await prisma.location.findMany({
      where,
      include: {
        City: { select: { id: true, Name: true, Status: true } },
      },
      orderBy: { Name: "asc" },
      take: limit ? Number(limit) : undefined,
    });

    res.status(200).json(locations.map(transformLocation));
  } catch (error) {
    next(new ApiError(500, error.message));
  }
};

// ---------------------------------------------------
// GET LOCATION BY ID
// ---------------------------------------------------
export const getLocationById = async (req, res, next) => {
  try {
    const loc = await prisma.location.findUnique({
      where: { id: req.params.id },
      include: {
        City: { select: { id: true, Name: true, Status: true } },
      },
    });

    if (!loc) return next(new ApiError(404, "Location not found"));

    res.status(200).json(transformLocation(loc));
  } catch (error) {
    next(new ApiError(500, error.message));
  }
};

// ---------------------------------------------------
// CREATE LOCATION
// ---------------------------------------------------
export const createLocation = async (req, res, next) => {
  try {
    const { Name, Status, City } = req.body;

    if (!City) return next(new ApiError(400, "City ID is required"));

    const loc = await prisma.location.create({
      data: {
        Name,
        Status: Status || "Active",
        cityId: City,
      },
      include: {
        City: { select: { id: true, Name: true, Status: true } },
      },
    });

    res.status(201).json(transformLocation(loc));
  } catch (error) {
    next(new ApiError(400, error.message));
  }
};

// ---------------------------------------------------
// UPDATE LOCATION
// ---------------------------------------------------
export const updateLocation = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Clone request body
    let updateData = { ...req.body };

    // 🚫 Remove fields Prisma should not update
    delete updateData.id;
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // ❌ Remove invalid nested field
    delete updateData.City;

    // ✔️ Map foreign key correctly
    if (req.body.City) {
      updateData.cityId = req.body.City;
    }

    const updatedLoc = await prisma.location.update({
      where: { id },
      data: updateData,
      include: {
        City: { select: { id: true, Name: true, Status: true } },
      },
    });

    res.status(200).json(transformLocation(updatedLoc));
  } catch (error) {
    if (error.code === "P2025") {
      return next(new ApiError(404, "Location not found"));
    }
    next(new ApiError(400, error.message));
  }
};

// ---------------------------------------------------
// DELETE LOCATION
// ---------------------------------------------------
export const deleteLocation = async (req, res, next) => {
  try {
    await prisma.location.delete({ where: { id: req.params.id } });

    res.status(200).json({ message: "Location deleted successfully" });
  } catch (error) {
    if (error.code === "P2025") {
      return next(new ApiError(404, "Location not found"));
    }
    next(new ApiError(500, error.message));
  }
};

// ---------------------------------------------------
// GET LOCATIONS BY CITY ID
// ---------------------------------------------------
export const getLocationByCity = async (req, res, next) => {
  try {
    const { cityId } = req.params;

    const locations = await prisma.location.findMany({
      where: { cityId },
      include: {
        City: { select: { id: true, Name: true, Status: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (locations.length === 0)
      return next(new ApiError(404, "No locations found for this city"));

    res.status(200).json({
      success: true,
      count: locations.length,
      data: locations.map(transformLocation),
    });
  } catch (error) {
    next(new ApiError(500, error.message));
  }
};
