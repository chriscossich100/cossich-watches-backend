const express = require("express");

const fs = require("fs");
const multer = require("multer");
const pool = require("./db");
const cors = require("cors");
const url = require("url");

console.log("the pool from postgres is: ", pool);

const app = express();

const port = 3030;

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log("the file is: ", file);
    let dir = "";
    let type = "";
    console.log("the req.body is: ", req.body);

    console.log("the fieldname is: ", file);

    if (file.fieldname == "brandImage") {
      dir = `./uploads/brands/${req.body.brandName.replace(
        /\s+/g,
        "-"
      )}/brandImage`;
      fs.access(dir, fs.constants.F_OK, (err) => {
        if (err) {
          // Directory does not exist, create it
          fs.mkdir(dir, { recursive: true }, (err) => {
            //in case there is an error with the actual creation of the directory.
            if (err) {
              return cb(
                new Error(
                  `There was an issue trying to create the brand: ${req.body.brandName}`
                )
              );
            }
            cb(null, dir);
          });
        } else {
          return cb(new Error("The directory already exists!")); // Handle the error
        }
      });
    } else if (file.fieldname == "imagepath") {
      console.log("do we get here at least?");
      dir = `./uploads/brands/${req.body.brand.replace(/\s+/g, "-")}/watches`;
      console.log("the directory is: ", dir);
      fs.access(dir, fs.constants.F_OK, (err) => {
        if (err) {
          // Directory does not exist, create it
          fs.mkdir(dir, { recursive: true }, (err) => {
            if (err) {
              console.log("do we get here where an error occurs?");
              return cb(
                new Error(
                  `There was an issue trying to create the directory for the watch called watches`
                )
              );
            }
            cb(null, dir);
          });
        } else {
          // Directory exists, proceed with the callback
          cb(null, dir);
        }
      });
    } else {
      console.log(
        "we get here because the user is uploading a banner in the creat blog post section",
        req.body.blogTitle,
        " and the content is: ",
        req.body
      );
      dir = `./uploads/blog-images/${req.body.blogTitle.replace(/\s+/g, "-")}`;
      fs.access(dir, fs.constants.F_OK, (err) => {
        if (err) {
          // Directory does not exist, create it
          fs.mkdir(dir, { recursive: true }, (err) => {
            if (err) {
              console.log("do we get here where an error occurs?");
              return cb(
                new Error(
                  `There was an issue trying to create the directory for the blog post called ${req.body.blogTitle}`
                )
              );
            }
            cb(null, dir);
          });
        } else {
          // Directory exists, proceed with the callback
          cb(null, dir);
        }
      });
    }
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname.replace(/\s+/g, "-"));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fieldSize: 5 * 1024 * 1024,
  },
});

app.use(express.json({ limit: "5mb" }));

app.use(cors());

//This is to serve the static files. Without this, the user will not be able to see the images or any other static files we want to serve such as css or js files.
app.use("/static", express.static("uploads"));

app.get("/", (req, res) => {
  res.header("Content-Type", "text/plain");
  res.send("Hello World!");
});

app.post("/cossichington/:name", async (req, res) => {
  console.log("the request body is: ", req.body);
  try {
    const client = await pool.connect();

    const res = await client.query(
      "insert into users values ($1, $2, $3, $4)",
      [req.body.username, req.body.email, req.body.password, req.body.admin]
    );
    client.release();
  } catch (error) {
    console.log("there has been an error: ", error);
  } finally {
    console.log(
      "do we get here where the finally case comes in and we close the pool???"
    );
    // await pool.end();
    res.send("we have successfully inserted a user into the database");
  }
});

app.get("/brands", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT * FROM brand");
    const quicker = await client.query(
      "SELECT * FROM brand LEFT JOIN watches ON brand.name = watches.brand ORDER BY name"
    );
    console.log("the quicker is: ", quicker.rows);
    const brandSummary = {};

    quicker.rows.forEach((brand) => {
      const firstLetter = brand.name.charAt(0);
      console.log("the first letter is: ", firstLetter);
      if (!brandSummary[firstLetter]) {
        brandSummary[firstLetter] = { brands: [], count: 0 };
      }
      const existingBrand = brandSummary[firstLetter].brands.find(
        (b) => b.name === brand.name
      );
      console.log("the existing brand is: ", existingBrand);
      if (existingBrand) {
        console.log("we got here because it exists");
        existingBrand.count++;
      } else {
        brandSummary[firstLetter].brands.push({
          name: brand.name,
          count: 1,
          imagepath: brand.brandimagepath,
        });
      }
      brandSummary[firstLetter].count++;
    });

    console.log(JSON.stringify(brandSummary));

    // console.log("the result is: ", result.rows);
    client.release();
    res.send({ result: result, brandSummary: brandSummary });
  } catch (error) {
    console.log("there has been an error: ", error);
  }
});

app.get("/watches", async (req, res) => {
  console.log("the url is: ", req.url);
  const parsedUrl = url.parse(req.url, true);
  const query = parsedUrl.query;
  console.log("query is ", query);

  //here we are getting the brands, since technically we need them for our filters
  //however, since brands are added dinamically to the database, we need to get them. We can't just hard code them.
  const pulledBrands = [];
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT * FROM brand");
    console.log("the result is: ", result.rows);
    client.release();
    // res.send(result.rows);
    console.log("the brands are: ", result.rows);
    result.rows.forEach((brand) => {
      pulledBrands.push(brand.name);
    });
  } catch (error) {
    console.log("there has been an error: ", error);
  }

  //this means that there are queries in the url. Aka filters are being applied on the front end.
  if (Object.keys(query).length > 0) {
    let filterConditions = [];
    for (const key in query) {
      console.log("the query.key is: ", query[key]);
      const filters = {
        ...pulledBrands.reduce((acc, brand) => {
          acc[brand] = `brand = '${brand}'`;
          return acc;
        }, {}),
        "< $250": "price < 250",
        "$250-$500": "price >= 250 AND price <= 500",
        "$500-$1000": "price >= 500 AND price <= 1000",
        "$1000-$2000": "price >= 1000 AND price <= 2000",
        "$2000-$5000": "price >= 2000 AND price <= 5000",
        "> $5000": "price > 5000",
        Automatic: "specifications->'overview'->>'movement' = 'Automatic'",
        Quartz: "specifications->'overview'->>'movement' = 'Quartz'",
        Solar: "specifications->'overview'->>'movement' = 'Solar'",
        "Stainless Steel":
          "specifications->'case'->>'material' = 'Stainless Steel'",
        Titanium: "specifications->'case'->>'material' = 'Titanium'",
        Gold: "specifications->'case'->>'material' = 'Gold'",
        Resin: "specifications->'case'->>'material' = 'Resin'",
        Bronze: "specifications->'case'->>'material' = 'Bronze'",
        "≤ 36mm": "specifications->'overview'->>'case size' <= '36'",
        "37-40mm":
          "specifications->'overview'->>'case size' >= '37' AND specifications->'overview'->>'case size' <= '40'",
        "41-44mm":
          "specifications->'overview'->>'case size' >= '41' AND specifications->'overview'->>'case size' <= '44'",
        "≥ 45mm": "specifications->'overview'->>'case size' >= '45'",
      };
      console.log("the filters are: ", filters);
      console.log("the filters selected are: ", filters[query[key]]);
      filterConditions.push(filters[query[key]]);
      // if (query.key) {
      //   console.log("the key is: ", key, "and the value is: ", filters[key]);
      // filterConditions.push(filters[key]);
      // }
    }
    console.log("the filter conditions are: ", filterConditions);
    const whereClause =
      filterConditions.length > 0
        ? `WHERE ${filterConditions.join(" AND ")}`
        : "";
    try {
      const client = await pool.connect();
      const result = await client.query(
        `SELECT * FROM watches ${whereClause} ORDER BY uploaded_time DESC`
      );
      console.log("the result is: ", result.rows);
      client.release();
      res.send(result.rows);
    } catch (error) {
      console.log("there has been an error: ", error);
    }
  } else {
    console.log("the query is not happening");
    try {
      const client = await pool.connect();
      const result = await client.query(
        "SELECT * FROM watches ORDER BY uploaded_time DESC"
      );
      console.log("the result is: ", result.rows);
      client.release();
      res.send(result.rows);
    } catch (error) {
      console.log("there has been an error: ", error);
    }
  }
});

app.get("/watch/:watch_name", async (req, res) => {
  req.params.watch_name = req.params.watch_name.replace(/_/g, " ");
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM watches JOIN brand on brand=name WHERE watch_name = $1",
      [req.params.watch_name]
    );
    console.log("the result is: ", result.rows);
    client.release();
    res.send(result.rows);
  } catch (error) {
    console.log("there has been an error: ", error);
  }
});

app.get("/closington", async (req, res) => {
  try {
    await pool.end();
  } catch (error) {
    console.log("there has been an error: ", error);
  }
  res.send("we have closed the connection to the database");
});

app.post("/createDirectory", async (req, res) => {
  //upload the file. Check if watch exists. If it does, return an error. If it doesn't, create the directory and save the file in the directory.
  upload.single("file")(req, res, async (err) => {
    if (err) {
      console.log("there has been an error: ", err.message);
      res.send({
        message: "There has been an error uploading the file",
        error: err.message,
      });
    } else {
      console.log("the request body is: ", req.file);
      // console.log('the file is: ', req.file);
      // const folderName = req.body;
      // console.log(folderName);
      // const directoryPath = `./static/images/watches/${folderName}`;

      console.log("and the body is: ", req.body.watch_name);

      let {
        watch_name,
        price,
        imagepath,
        brand,
        description,
        videoReviewValue,
        blogPostValue,
      } = req.body;

      if (videoReviewValue == null) {
        videoReviewValue = "none";
      }

      if (blogPostValue == null) {
        blogPostValue = "none";
      }

      const specifications = {
        overview: {
          reference: req.body.reference,
          "case size": req.body.caseSize,
          "case height": req.body.caseHeight,
          "lug to lug": req.body.lugToLug,
          "lug width": req.body.lugWidth,
          "Water resistance": req.body.waterResistance,
          movement: req.body.movement,
        },
        case: {
          caseback: req.body.caseBack,
          material: req.body.caseMaterial,
          crown: req.body.crown,
          hands: req.body.hands,
          lume: req.body.lume,
          strapBraceletMaterial: req.body.strapBraceletMaterial,
          weight: req.body.Weight,
        },
        movement: {
          caliber: req.body.caliber,
          frequency: req.body.frequency,
          functions: req.body.functions,
          powerReserve: req.body.powerReserve,
        },
      };

      try {
        const client = await pool.connect();
        const result = await client.query(
          "INSERT INTO watches (watch_name, price, imagepath, brand, description, specifications, video_review, blog_post_link, uploaded_time) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *",
          [
            watch_name,
            price,
            imagepath,
            brand,
            description,
            specifications,
            videoReviewValue,
            blogPostValue,
            new Date(),
          ]
        );
        client.release();
        console.log(
          "The watch has been added to the database: ",
          result.rows[0]
        );
        res.send({
          message: "The watch has been added to the database",
          watch: result.rows[0],
        });
      } catch (error) {
        console.log("There has been an error: ", error);
        res.send({
          message: "There has been an error adding the watch to the database",
          error: error.message,
        });
      }
    }
  });

  // try {
  //   fs.mkdir(directoryPath, (err) => {
  //     if (err) {
  //       console.log("there has been an error: ", err.message);
  //       res.send({ message: "This watch already exists! Please create a new one.", error: err.message });
  //     } else {
  //       console.log("The directoy has been created");
  //       res.send({ message: "The directory has been created" });
  //     }
  //   });
  // } catch {
  //   console.log("there has been an error: ", err);
  //   res.send({ message: "there has been an error trying to create the watch data!", error: err.messgae });
  // }

  // res.send({ message: "We got here dude" });
});

app.post("/brand-upload", async (req, res, next) => {
  upload.single("brandImage")(req, res, async (err) => {
    if (err) {
      console.log("there has been an error: ", err.message);
      res.send({
        message: "There has been an error uploading the file",
        error: err.message,
      });
    } else {
      console.log("the request body is: ", req.body.brandName);
      console.log("the file is: ", req.file);

      //this means we are are able to create the watch brand in the database.
      try {
        const client = await pool.connect();
        const result = await client.query(
          "INSERT INTO brand (name, link, brandimagepath, brand_description) VALUES ($1, $2, $3, $4) RETURNING *",
          [
            req.body.brandName,
            req.body.brandLink,
            req.body.brandImagePath,
            req.body.brandDescription,
          ]
        );
        client.release();
        res.send({
          message: "The brand has been added to the database",
          brand: result.rows[0],
        });
      } catch (error) {
        console.log("there has been an error: ", error);
        res.send({
          message: "There has been an error adding the brand to the database",
          error: error.message,
        });
      }

      // res.send({ message: "We got here dude at the end we didd it" });
    }
  });
});

app.post("/create-blog", async (req, res) => {
  upload.single("banner_photo")(req, res, async (err) => {
    console.log(
      "after the multer upload we have: ",
      req.body,
      "also the file is: ",
      req.file
    );
    // console.log('the file destination is: ', req.file.destination, "and the path is: ", req.file.destination.replace('./uploads', 'static'));
    if (err) {
      console.log("there has been an error uplading the file: ", err.message);
      res.send({
        errorMessage: "There has been an error uploading the file",
        error: err.message,
        errorFound: true,
      });
    } else {
      console.log("the request body is: ", req.body.content);
      console.log("the file is: ", req.file);

      try {
        const client = await pool.connect();
        const result = await client.query(
          "INSERT INTO posts (title, author, subtitle, quicksummary, bannerimagepath, dateuploaded, content, slug) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
          [
            req.body.blogTitle,
            "chriscoss95",
            req.body.subTitle,
            req.body.quickSummary,
            "static/blog-images/" +
              req.body.blogTitle.replace(/\s+/g, "-") +
              "/" +
              req.file.originalname.replace(/\s+/g, "-"),
            new Date(),
            req.body.content,
            req.body.blogTitle.replace(/\s+/g, "-"),
          ]
        );
        client.release();
        res.send({
          errorMessage: "",
          message: "Blog post has been submitted successfully!",
          blogInfo: result.rows[0],
        });
      } catch (error) {
        console.log("there has been an error: ", error);
        res.send({
          message: "There has been an error adding the brand to the database",
          error: error.message,
        });
      }
    }
  });
});

app.get("/blog/:blog_title", async (req, res) => {
  console.log("the blog title is: ", req.params.blog_title);
  try {
    const client = await pool.connect();
    const result = await client.query("SELECT * FROM posts WHERE slug = $1", [
      req.params.blog_title,
    ]);
    console.log("the result is: ", result.rows);
    client.release();
    res.send(result.rows);
  } catch (error) {
    console.log("there has been an error: ", error);
  }
});

app.get("/blog-posts", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM posts ORDER BY dateuploaded DESC LIMIT 3"
    );
    console.log("the result is: ", result.rows);
    client.release();
    res.send(result.rows);
  } catch (error) {
    console.log("there has been an error: ", error);
    res.send({
      message: "There has been an error retrieving the blog posts",
      error: error.message,
    });
  }
});

app.listen(port, async () => {
  //   try {
  //     await pool.connect();
  //   } catch (error) {
  //     console.log("there has been an error: ", error);
  //   }
  console.log(`Server running at http://localhost:${port}/`);
});
