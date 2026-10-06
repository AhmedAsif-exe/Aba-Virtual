const express = require("express");

const SupervisionBoard = require("../Schema/SupervisionBoard");
const SuperviseeProfile = require("../Schema/SuperviseeProfile");
const { ensureAuth, ensureSupervisor } = require("../Middleware/supervisionAuth");

const router = express.Router();

// The whole router is supervisor-only: the board list is an admin surface,
// and a supervisee sees only the one board named on their own profile.
router.use(ensureAuth, ensureSupervisor);

/** `?all=1` includes retired boards, for the management screen. */
router.get("/", async (req, res, next) => {
  try {
    const filter = req.query.all === "1" ? {} : { active: true };
    const boards = await SupervisionBoard.find(filter).sort({ sortOrder: 1, name: 1 }).lean();
    res.json({ boards });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const name = (req.body?.name || "").trim();
    if (!name) return res.status(400).json({ message: "Board name is required" });

    const board = await SupervisionBoard.create({
      name,
      fullName: (req.body?.fullName || "").trim(),
      defaultRequiredHours: req.body?.defaultRequiredHours ?? null,
      defaultRatio: (req.body?.defaultRatio || "").trim(),
      sortOrder: Number(req.body?.sortOrder) || 0,
    });

    res.status(201).json({ board });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "A board with that name already exists" });
    }
    next(err);
  }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const board = await SupervisionBoard.findById(req.params.id);
    if (!board) return res.status(404).json({ message: "Board not found" });

    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: "Board name is required" });
      board.name = name;
    }
    if (req.body?.fullName !== undefined) board.fullName = String(req.body.fullName).trim();
    if (req.body?.defaultRatio !== undefined) {
      board.defaultRatio = String(req.body.defaultRatio).trim();
    }
    if (req.body?.defaultRequiredHours !== undefined) {
      board.defaultRequiredHours =
        req.body.defaultRequiredHours === null ? null : Number(req.body.defaultRequiredHours);
    }
    if (req.body?.active !== undefined) board.active = !!req.body.active;
    if (req.body?.sortOrder !== undefined) board.sortOrder = Number(req.body.sortOrder) || 0;

    await board.save();
    res.json({ board });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(409).json({ message: "A board with that name already exists" });
    }
    next(err);
  }
});

/**
 * Deleting a board that profiles point at would strip the certification
 * context from hour logs gathered for it, so a board in use is retired
 * instead — it disappears from the dropdown, and existing supervisees keep
 * reading correctly.
 */
router.delete("/:id", async (req, res, next) => {
  try {
    const board = await SupervisionBoard.findById(req.params.id);
    if (!board) return res.status(404).json({ message: "Board not found" });

    const inUse = await SuperviseeProfile.countDocuments({ boardId: board._id });
    if (inUse > 0) {
      board.active = false;
      await board.save();
      return res.json({
        board,
        retired: true,
        message: `${board.name} is used by ${inUse} supervisee(s), so it was hidden from the list rather than deleted.`,
      });
    }

    await board.deleteOne();
    res.json({ message: "Board deleted", retired: false });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
