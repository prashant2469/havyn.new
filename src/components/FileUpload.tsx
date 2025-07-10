import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileCheck, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFilesSelected: (files: { [key: string]: File }) => void;
  fileType: 'delinquency' | 'rentRoll' | 'directory' | 'combined';
  label: string;
  optional?: boolean;
}

export function FileUpload({ onFilesSelected, fileType, label, optional = false }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
        setError('Please upload a CSV file');
        return;
      }
      setFile(selectedFile);
      setError(null);
      onFilesSelected({ [fileType]: selectedFile });
    }
  }, [fileType, onFilesSelected]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    maxFiles: 1
  });

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20' 
            : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-400'}
          ${file 
            ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-600' 
            : ''}
          ${error 
            ? 'bg-red-50 border-red-300 dark:bg-red-900/20 dark:border-red-600' 
            : ''}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2">
          {file ? (
            <>
              <FileCheck className="w-8 h-8 text-green-500 dark:text-green-400" />
              <p className="text-sm text-green-600 dark:text-green-400">{file.name}</p>
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </>
          ) : (
            <>
              <Upload className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {label}
                {optional && <span className="text-gray-400 dark:text-gray-500 ml-1">(optional)</span>}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isDragActive ? 'Drop the CSV file here' : 'Drag & drop or click to select CSV'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}