# FreeConvert4U - Image Conversion Tool

![FreeConvert4U Logo](favicon.ico)

FreeConvert4U is a powerful and user-friendly image conversion tool that allows you to convert images between various formats quickly and easily. With support for over 50 image formats, this web application provides a seamless experience for all your image conversion needs.

## 🌟 Features

- **Wide Format Support**: Convert between 50+ image formats, including JPEG, PNG, GIF, WebP, TIFF, HEIC, SVG, and many more.
- **Batch Conversion**: Upload and convert multiple files at once, saving time and effort.
- **High-Quality Output**: Maintain image quality during conversion with customizable settings.
- **User-Friendly Interface**: Simple and intuitive design for easy navigation and use.
- **Secure & Private**: Your files are processed locally and deleted after conversion.
- **Free to Use**: No registration or payment required.
- **Responsive Design**: Works seamlessly on desktop and mobile devices.

## 🚀 Live Demo

Experience FreeConvert4U in action at [https://freeconvert4u.com](https://freeconvert4u.com)

## 🛠️ Installation

### Prerequisites

Before setting up FreeConvert4U, ensure you have the following installed on your system:

1. **Node.js**: FreeConvert4U requires Node.js version 14.x or higher. Download and install it from the [official Node.js website](https://nodejs.org/).

2. **Ghostscript**: This is required for handling PDF conversions.
   - For Windows: Download and install from the [Ghostscript website](https://www.ghostscript.com/download/gsdnld.html)
   - For macOS: Install using Homebrew: `brew install ghostscript`
   - For Linux: Install using apt: `sudo apt-get install ghostscript`

3. **ImageMagick**: This is the core tool used for image conversions.
   - For Windows: Download and install from the [ImageMagick Official Website](https://imagemagick.org/script/download.php)
   - For macOS: Install using Homebrew: `brew install imagemagick`
   - For Linux: Install using apt: `sudo apt-get install imagemagick`

### Setup

Once you have the prerequisites installed, follow these steps to set up FreeConvert4U:

1. Clone the repository:
   ```
   git clone https://github.com/fazee6/freeconvert4u.git
   cd freeconvert4u
   ```

2. Install project dependencies:
   ```
   npm install
   ```

3. Set up SSL certificates:
   - Generate SSL certificates using Let's Encrypt or a similar service.
   - Place the certificate files in the appropriate directory (default: `/etc/letsencrypt/live/freeconvert4u.com/`).

4. Configure the server:
   - Update the paths to your SSL certificates in `server.js` if necessary.
   - Adjust other settings in `server.js` as needed (e.g., ports, file size limits).

5. Start the server:
   ```
   node server.js
   ```

6. Access the application at `https://localhost:443` (or the port you configured).

## 🖥️ Usage

1. Open the application in your web browser.
2. Click the "Choose Files" button or drag and drop images onto the designated area.
3. Select the desired output format from the dropdown menu.
4. Click the "Convert" button to start the conversion process.
5. Once complete, download your converted images individually or as a zip file for batch conversions.

## 🤝 Contributing

We welcome contributions to FreeConvert4U! If you'd like to contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Make your changes and commit them with descriptive commit messages.
4. Push your changes to your fork.
5. Submit a pull request to the main repository.

Please ensure your code adheres to the existing style and includes appropriate tests.

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 📞 Support

If you encounter any issues or have questions, please [open an issue](https://github.com/fazee6/image-converter/issues) on GitHub.

---

Made with ❤️ by FreeConvert4U Team